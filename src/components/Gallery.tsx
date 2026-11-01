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
        Supabase returned an error: {error}. Check that you ran{' '}
        <code className="text-bone">supabase/schema.sql</code>.
      </Notice>
    );
  }

  if (wallpapers.length === 0) {
    return <Notice title="Nothing here yet">New wallpapers will show up here as they are added.</Notice>;
  }

  return (
    <section id="gallery" className="scroll-mt-0">
      <div className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 py-3 sm:px-8">
          <Pill active={activeTag === 'all'} onClick={() => setActiveTag('all')} count={wallpapers.length}>
            All
          </Pill>
          {tags.map(([tag, count]) => (
            <Pill key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)} count={count}>
              {tag}
            </Pill>
          ))}
        </div>
      </div>

      {/*
        Justified rows: every wallpaper in a row has the same height and keeps its own shape.
        Each item's width follows its aspect ratio; the trailing ::after stops the last row stretching.
      */}
      <ul className="mx-auto flex max-w-[1600px] flex-wrap gap-2 px-4 py-6 [--row:130px] after:grow-[1000] after:basis-0 after:content-[''] sm:px-8 sm:[--row:200px] xl:[--row:260px]">
        {visible.map((w) => {
          const ratio = w.width / w.height;
          return (
            <li
              key={w.id}
              className="relative overflow-hidden rounded-md bg-panel"
              style={{ flexGrow: ratio * 100, flexBasis: `calc(${ratio} * var(--row))` }}
            >
              <button
                type="button"
                onClick={() => setSelected(w)}
                aria-label={`${w.title}: choose a size and download`}
                className="group block w-full text-left"
              >
                <span className="block" style={{ paddingBottom: `${(1 / ratio) * 100}%` }} />
                {/* Plain img on purpose: thumbnails are pre-sized at upload, so Vercel image optimization isn't needed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(w.thumb_path)}
                  alt={w.title}
                  width={w.width}
                  height={w.height}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                  <span className="truncate text-sm font-semibold">{w.title}</span>
                  <span className="shrink-0 text-xs text-bone/70">
                    {w.width} × {w.height}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && <DownloadModal wallpaper={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function Pill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-4 pr-3 text-sm ${
        active
          ? 'border-glow bg-glow font-semibold text-glow-ink'
          : 'border-line text-bone hover:border-mute'
      }`}
    >
      {children}
      <span className={`text-xs ${active ? 'text-glow-ink/70' : 'text-mute'}`}>{count}</span>
    </button>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-8">
      <div className="max-w-lg rounded-xl border border-line bg-panel p-6">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">{children}</p>
      </div>
    </div>
  );
}
