'use client';

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { getSupabase } from '@/lib/supabase';
import { BUCKET, ORIGINALS_BUCKET } from '@/lib/storage';
import { prepareUpload } from '@/lib/resize';
import { mergeTags, parseTags } from '@/lib/tags';
import { formatBytes } from '@/lib/format';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 50 * 1024 * 1024; // Supabase free plan per-file limit

function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : '';
}

type Props = {
  existingTags: string[];
  onUploaded: () => Promise<void> | void;
};

export default function UploadForm({ existingTags, onUploaded }: Props) {
  const supabase = getSupabase();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local preview of the chosen file, released when it changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(next: File | null | undefined) {
    if (!next) return;
    setError(null);
    setStatus(null);
    if (!ALLOWED_TYPES[next.type]) {
      setError('Use a JPG, PNG or WebP file.');
      return;
    }
    if (next.size > MAX_BYTES) {
      setError('That file is over 50 MB, the upload limit on the free Supabase plan.');
      return;
    }
    setFile(next);
    if (!title.trim()) setTitle(titleFromFilename(next.name));
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  }

  function commitDraft(): string[] {
    const next = mergeTags(tags, parseTags(draft));
    setTags(next);
    setDraft('');
    return next;
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !file || busy) return;
    setError(null);
    setStatus(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Add a title.');
      return;
    }
    const finalTags = mergeTags(tags, parseTags(draft));
    const ext = ALLOWED_TYPES[file.type];

    setBusy(true);
    const id = crypto.randomUUID();
    const originalPath = `${id}/original.${ext}`;
    const thumbPath = `${id}/thumb.jpg`;

    try {
      setStatus('Preparing preview…');
      const { width, height, thumb } = await prepareUpload(file);

      setStatus('Uploading original…');
      // The full-size original goes to the private bucket. Only the small preview is public.
      const original = await supabase.storage.from(ORIGINALS_BUCKET).upload(originalPath, file, {
        contentType: file.type,
        cacheControl: '31536000',
      });
      if (original.error) throw original.error;

      setStatus('Uploading preview…');
      const preview = await supabase.storage.from(BUCKET).upload(thumbPath, thumb, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      });
      if (preview.error) {
        await supabase.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
        throw preview.error;
      }

      setStatus('Saving…');
      const inserted = await supabase.from('wallpapers').insert({
        id,
        title: cleanTitle,
        tags: finalTags,
        original_path: originalPath,
        file_path: null,
        thumb_path: thumbPath,
        width,
        height,
        size_bytes: file.size,
      });
      if (inserted.error) {
        await supabase.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
        await supabase.storage.from(BUCKET).remove([thumbPath]);
        throw inserted.error;
      }

      setStatus('Uploaded. It appears on the homepage within a minute.');
      setFile(null);
      setTitle('');
      setTags([]);
      setDraft('');
      if (inputRef.current) inputRef.current.value = '';
      await onUploaded();
    } catch (err) {
      setStatus(null);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Upload failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = existingTags.filter((t) => !tags.includes(t)).slice(0, 12);

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-lg font-bold">Add a wallpaper</h2>

      {/* Drop area, also the tap target for choosing a file on a phone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-glow ${
          dragging ? 'border-glow bg-ink' : 'border-line hover:border-mute'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {file && previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{file.name}</span>
              <span className="block text-sm text-mute">{formatBytes(file.size)}. Tap to change.</span>
            </span>
          </>
        ) : (
          <span className="block py-5 text-center sm:py-8" style={{ width: '100%' }}>
            <span className="block font-medium">Choose an image</span>
            <span className="mt-1 block text-sm text-mute">
              or drop it here. JPG, PNG or WebP, up to 50 MB.
            </span>
          </span>
        )}
      </label>

      <div>
        <label htmlFor="wallpaper-title" className="mb-1.5 block text-sm text-mute">
          Title
        </label>
        <input
          id="wallpaper-title"
          className="field"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="wallpaper-tags" className="mb-1.5 block text-sm text-mute">
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-ink px-2 py-2 focus-within:border-mute">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-line py-1 pl-3 pr-1.5 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
                className="grid h-5 w-5 place-items-center rounded-full text-mute hover:text-bone"
              >
                ×
              </button>
            </span>
          ))}
          <input
            id="wallpaper-tags"
            className="min-w-[8ch] flex-1 bg-transparent px-1 py-1 text-sm text-bone placeholder:text-mute focus:outline-none"
            placeholder={tags.length === 0 ? 'landscape, dark, minimal' : 'Add another'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onTagKeyDown}
            onBlur={() => draft.trim() && commitDraft()}
          />
        </div>
        <p className="mt-1.5 text-xs text-mute">Press Enter or a comma after each tag.</p>
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Existing tags">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(mergeTags(tags, [tag]))}
                className="rounded-full border border-line px-3 py-1 text-sm text-mute hover:border-mute hover:text-bone"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy || !file}>
          {busy ? 'Uploading…' : 'Upload wallpaper'}
        </button>
        <div aria-live="polite" className="min-h-5 pt-2 text-sm">
          {error && <p className="text-danger">{error}</p>}
          {status && !error && <p className="text-mute">{status}</p>}
        </div>
      </div>
    </form>
  );
}
