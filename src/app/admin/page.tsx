'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { BUCKET, storageUrl } from '@/lib/storage';
import { prepareUpload } from '@/lib/resize';
import type { Wallpaper } from '@/lib/types';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_BYTES = 50 * 1024 * 1024; // Supabase free plan per-file limit

function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (tag) seen.add(tag);
  }
  return [...seen];
}

export default function AdminPage() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin</h1>
      {!supabase ? (
        <p className="mt-4 text-sm text-mute">
          Supabase isn&apos;t configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first.
        </p>
      ) : !ready ? (
        <p className="mt-4 text-sm text-mute">Loading…</p>
      ) : session ? (
        <Dashboard email={session.user.email ?? ''} />
      ) : (
        <SignIn />
      )}
    </main>
  );
}

function SignIn() {
  const supabase = getSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError('Email or password is incorrect.');
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-sm space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-mute">Email</span>
        <input
          className="field"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-mute">Password</span>
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function Dashboard({ email }: { email: string }) {
  const supabase = getSupabase();
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setItems((data ?? []) as Wallpaper[]);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !file || busy) return;
    setError(null);
    setStatus(null);

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      setError('Use a JPG, PNG or WebP file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is over 50 MB, the upload limit on the free Supabase plan.');
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Add a title.');
      return;
    }

    setBusy(true);
    const id = crypto.randomUUID();
    const filePath = `${id}/original.${ext}`;
    const thumbPath = `${id}/thumb.jpg`;

    try {
      setStatus('Preparing preview…');
      const { width, height, thumb } = await prepareUpload(file);

      setStatus('Uploading original…');
      const original = await supabase.storage.from(BUCKET).upload(filePath, file, {
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
        await supabase.storage.from(BUCKET).remove([filePath]);
        throw preview.error;
      }

      setStatus('Saving…');
      const inserted = await supabase.from('wallpapers').insert({
        id,
        title: cleanTitle,
        tags: parseTags(tagsInput),
        file_path: filePath,
        thumb_path: thumbPath,
        width,
        height,
        size_bytes: file.size,
      });
      if (inserted.error) {
        await supabase.storage.from(BUCKET).remove([filePath, thumbPath]);
        throw inserted.error;
      }

      setStatus('Uploaded. It appears on the homepage within a minute.');
      setTitle('');
      setTagsInput('');
      setFile(null);
      setFileKey((k) => k + 1);
      await refresh();
    } catch (err) {
      setStatus(null);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Upload failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(w: Wallpaper) {
    if (!supabase) return;
    if (!window.confirm(`Delete "${w.title}"? This removes the files too.`)) return;
    setError(null);
    const removed = await supabase.storage.from(BUCKET).remove([w.file_path, w.thumb_path]);
    if (removed.error) {
      setError(`Delete failed: ${removed.error.message}`);
      return;
    }
    const deleted = await supabase.from('wallpapers').delete().eq('id', w.id);
    if (deleted.error) {
      setError(`Delete failed: ${deleted.error.message}`);
      return;
    }
    await refresh();
  }

  return (
    <div className="mt-6 space-y-10">
      <div className="flex items-center justify-between gap-3 text-sm text-mute">
        <span className="truncate">Signed in as {email}</span>
        <button type="button" className="btn-quiet" onClick={() => supabase?.auth.signOut()}>
          Sign out
        </button>
      </div>

      <form onSubmit={onUpload} className="space-y-4 rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-xl font-bold">Add a wallpaper</h2>
        <label className="block">
          <span className="mb-1.5 block text-sm text-mute">Title</span>
          <input
            className="field"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-mute">Tags, separated by commas</span>
          <input
            className="field"
            placeholder="landscape, dark, minimal"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-mute">Image file (JPG, PNG or WebP, up to 50 MB)</span>
          <input
            key={fileKey}
            className="field file:mr-3 file:rounded file:border-0 file:bg-line file:px-3 file:py-1 file:text-bone"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={busy || !file}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <div aria-live="polite" className="min-h-5 text-sm">
          {error && <p className="text-danger">{error}</p>}
          {status && !error && <p className="text-mute">{status}</p>}
        </div>
      </form>

      <section>
        <h2 className="font-display text-xl font-bold">Library ({items.length})</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-mute">No wallpapers yet. Upload your first one above.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-panel">
            {items.map((w) => (
              <li key={w.id} className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(w.thumb_path)}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{w.title}</p>
                  <p className="truncate text-sm text-mute">
                    {w.width} × {w.height}
                    {w.tags.length > 0 ? `, ${w.tags.join(', ')}` : ''}
                  </p>
                </div>
                <button type="button" className="btn-quiet" onClick={() => onDelete(w)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
