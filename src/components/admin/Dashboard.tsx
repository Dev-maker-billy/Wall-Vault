'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { BUCKET } from '@/lib/storage';
import { formatBytes } from '@/lib/format';
import type { Wallpaper } from '@/lib/types';
import UploadForm from './UploadForm';
import Library from './Library';

const STORAGE_LIMIT = 1024 ** 3; // Supabase free plan: 1 GB of file storage

export default function Dashboard({ email }: { email: string }) {
  const supabase = getSupabase();
  const [items, setItems] = useState<Wallpaper[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('wallpapers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) setLoadError(error.message);
    else {
      setLoadError(null);
      setItems((data ?? []) as Wallpaper[]);
    }
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const existingTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of items) for (const t of w.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [items]);

  const used = useMemo(() => items.reduce((sum, w) => sum + (w.size_bytes ?? 0), 0), [items]);
  const percent = Math.min(100, (used / STORAGE_LIMIT) * 100);

  async function removeWallpaper(w: Wallpaper): Promise<string | null> {
    if (!supabase) return 'Not connected to Supabase.';
    const removed = await supabase.storage.from(BUCKET).remove([w.file_path, w.thumb_path]);
    if (removed.error) return `Delete failed: ${removed.error.message}`;
    const deleted = await supabase.from('wallpapers').delete().eq('id', w.id);
    if (deleted.error) return `Delete failed: ${deleted.error.message}`;
    await refresh();
    return null;
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Vault Admin</h1>
          <p className="mt-1 truncate text-sm text-mute">Signed in as {email}</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="btn-quiet" target="_blank" rel="noreferrer">
            View site
          </a>
          <button type="button" className="btn-quiet" onClick={() => supabase?.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6 lg:sticky lg:top-6">
          <UploadForm existingTags={existingTags} onUploaded={refresh} />

          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-bold">Storage</h2>
              <p className="text-sm text-mute">{formatBytes(used)} of 1 GB</p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-ink"
              role="progressbar"
              aria-label="Storage used by original files"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
            >
              <div
                className={`h-full rounded-full ${percent > 85 ? 'bg-danger' : 'bg-glow'}`}
                style={{ width: `${Math.max(percent, used > 0 ? 1 : 0)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-mute">
              Counts original files against the free plan&apos;s 1 GB. Previews add a little more.
            </p>
          </div>
        </div>

        <section aria-labelledby="library-title">
          <h2 id="library-title" className="mb-3 font-display text-lg font-bold">
            Library{loaded ? ` (${items.length})` : ''}
          </h2>
          {loadError ? (
            <p role="alert" className="text-sm text-danger">
              Couldn&apos;t load the library: {loadError}
            </p>
          ) : !loaded ? (
            <p className="text-sm text-mute">Loading…</p>
          ) : (
            <Library items={items} onRemove={removeWallpaper} />
          )}
        </section>
      </div>
    </div>
  );
}
