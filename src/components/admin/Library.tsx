'use client';

import { useState } from 'react';
import type { Wallpaper } from '@/lib/types';
import { storageUrl } from '@/lib/storage';
import { formatBytes } from '@/lib/format';

type Props = {
  items: Wallpaper[];
  /** Resolves to an error message, or null when the wallpaper was removed. */
  onRemove: (wallpaper: Wallpaper) => Promise<string | null>;
};

export default function Library({ items, onRemove }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(w: Wallpaper) {
    setRemovingId(w.id);
    setError(null);
    const message = await onRemove(w);
    if (message) setError(message);
    setRemovingId(null);
    setConfirmId(null);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="font-medium">No wallpapers yet</p>
        <p className="mt-1 text-sm text-mute">Upload your first one with the form.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {items.map((w) => {
          const confirming = confirmId === w.id;
          const removing = removingId === w.id;
          return (
            <li key={w.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storageUrl(w.thumb_path)}
                alt=""
                width={112}
                height={84}
                loading="lazy"
                className="h-[63px] w-[84px] shrink-0 rounded-lg bg-ink object-cover sm:h-[84px] sm:w-[112px]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{w.title}</p>
                <p className="mt-0.5 text-sm text-mute">
                  {w.width} × {w.height}
                  {w.size_bytes ? `, ${formatBytes(w.size_bytes)}` : ''}
                </p>
                {w.tags.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {w.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-line px-2 py-0.5 text-xs text-mute"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="shrink-0">
                {confirming ? (
                  <div className="flex flex-col gap-1.5 sm:flex-row">
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={removing}
                      onClick={() => remove(w)}
                    >
                      {removing ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      className="btn-quiet"
                      disabled={removing}
                      onClick={() => setConfirmId(null)}
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-quiet"
                    aria-label={`Delete ${w.title}`}
                    onClick={() => setConfirmId(w.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
