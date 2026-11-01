'use client';

import { useMemo, useState } from 'react';
import type { Wallpaper } from '@/lib/types';
import { storageUrl } from '@/lib/storage';
import DownloadModal from './DownloadModal';

type Props = {
  wallpapers: Wallpaper[];
  configured: boolean;
  error: string | null;
};

export default function Gallery({ wallpapers, configured, error }: Props) {
  const [activeTag, setActiveTag] = useState<string>('all');
  const [selected, setSelected] = useState<Wallpaper | null>(null);

  // Tags come straight from the data, most used first.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of wallpapers) for (const t of w.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [wallpapers]);

  const visible = useMemo(
    () => (activeTag === 'all' ? wallpapers : wallpapers.filter((w) => w.tags.includes(activeTag))),
    [wallpapers, activeTag],
  );

  if (!configured) {
    return (
      <Notice title="Supabase isn't connected yet">
        Add <code className="text-bone">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code className="text-bone">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your Vercel project
        settings, then redeploy.
      </Notice>
    );
  }

  if (error) {
    return (
      <Notice title="Couldn't load wallpapers">
        Supabase returned an error: {error}. Check that you ran <code className="text-bone">supabase/schema.sql</code>.
      </Notice>
    );
  }

  if (wallpapers.length === 0) {
    return <Notice title="Nothing here yet">New wallpapers will show up here as they are added.</Notice>;
  }

  return (
    <>
      <div className="sticky top-0 z-10 border-y border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 py-3 sm:px-8">
          <Pill active={activeTag === 'all'} onClick={() => setActiveTag('all')}>
            All <span className="opacity-60">{wallpapers.length}</span>
          </Pill>
          {tags.map(([tag, count]) => (
            <Pill key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
              {tag} <span className="opacity-60">{count}</span>
            </Pill>
          ))}
        </div>
      </div>

      <ul className="mx-auto max-w-[1600px] columns-2 gap-3 px-4 py-6 sm:px-8 md:columns-3 xl:columns-4">
        {visible.map((w) => (
          <li key={w.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              onClick={() => setSelected(w)}
              aria-label={`${w.title}: choose a size and download`}
              className="group relative block w-full overflow-hidden rounded-md bg-panel text-left"
            >
              {/* Plain img on purpose: thumbnails are pre-sized at upload, so Vercel image optimization isn't needed. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storageUrl(w.thumb_path)}
                alt={w.title}
                width={w.width}
                height={w.height}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-12 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {w.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && <DownloadModal wallpaper={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
        active
          ? 'border-brass bg-brass font-semibold text-brass-deep'
          : 'border-line text-bone hover:border-mute'
      }`}
    >
      {children}
    </button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8">
      <div className="max-w-lg rounded-xl border border-line bg-panel p-6">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">{children}</p>
      </div>
    </div>
  );
}
