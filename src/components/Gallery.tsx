'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef(new Map<string, HTMLButtonElement>());
  const firstRun = useRef(true);

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

  // The highlight slides to the chosen pill, and the pill row scrolls to keep it in view.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRefs.current.get(activeTag);
    if (!bar || !pill) return;

    const measure = () => {
      const current = pillRefs.current.get(activeTag);
      if (!current) return;
      const next = { left: current.offsetLeft, width: current.offsetWidth };
      setIndicator((prev) =>
        prev && prev.left === next.left && prev.width === next.width ? prev : next,
      );
    };
    measure();

    // Skip the first run so the page doesn't scroll sideways on load.
    if (!firstRun.current) {
      bar.scrollTo({
        left: pill.offsetLeft - (bar.clientWidth - pill.offsetWidth) / 2,
        behavior: 'smooth',
      });
    }
    firstRun.current = false;

    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [activeTag, tags]);

  // Tiles ease in as they enter the screen. Changing the filter remounts the list, so it replays.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const tiles = list.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)');
    if (!('IntersectionObserver' in window)) {
      tiles.forEach((tile) => tile.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    );
    tiles.forEach((tile) => observer.observe(tile));
    return () => observer.disconnect();
  }, [visible]);

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

  const register = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) pillRefs.current.set(key, el);
    else pillRefs.current.delete(key);
  };

  return (
    <section id="gallery" className="scroll-mt-0">
      <div className="sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur">
        <div
          ref={barRef}
          className="relative mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 py-3 sm:px-8"
        >
          {indicator && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-3 h-[34px] rounded-full bg-glow"
              style={{
                width: indicator.width,
                transform: `translateX(${indicator.left}px)`,
                transition:
                  'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            />
          )}
          <Pill
            buttonRef={register('all')}
            active={activeTag === 'all'}
            slides={indicator !== null}
            onClick={() => setActiveTag('all')}
            count={wallpapers.length}
          >
            All
          </Pill>
          {tags.map(([tag, count]) => (
            <Pill
              key={tag}
              buttonRef={register(tag)}
              active={activeTag === tag}
              slides={indicator !== null}
              onClick={() => setActiveTag(tag)}
              count={count}
            >
              {tag}
            </Pill>
          ))}
        </div>
      </div>

      {/*
        Justified rows: every wallpaper in a row has the same height and keeps its own shape.
        Each item's width follows its aspect ratio; the trailing ::after stops the last row stretching.
      */}
      <ul
        key={activeTag}
        ref={listRef}
        className="mx-auto flex max-w-[1600px] flex-wrap gap-2 px-4 py-6 [--row:130px] after:grow-[1000] after:basis-0 after:content-[''] sm:px-8 sm:[--row:200px] xl:[--row:260px]"
      >
        {visible.map((w, i) => {
          const ratio = w.width / w.height;
          return (
            <li
              key={w.id}
              data-reveal
              className="reveal relative overflow-hidden rounded-md bg-panel"
              style={{
                flexGrow: ratio * 100,
                flexBasis: `calc(${ratio} * var(--row))`,
                transitionDelay: `${(i % 6) * 55}ms`,
              }}
            >
              <button
                type="button"
                onClick={() => setSelected(w)}
                data-cursor="tile"
                aria-label={`${w.title}: choose a size and download`}
                className="tile-inner group block w-full text-left"
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
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out [@media(hover:hover)]:group-hover:scale-[1.06]"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100">
                  <span className="truncate text-sm font-semibold">{w.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-bone/70">
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
  slides,
  onClick,
  count,
  buttonRef,
  children,
}: {
  active: boolean;
  /** True once the sliding highlight is measured; before that the active pill paints its own fill. */
  slides: boolean;
  onClick: () => void;
  count: number;
  buttonRef: (el: HTMLButtonElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-4 pr-3 text-sm font-medium transition duration-200 active:scale-95 ${
        active
          ? `border-transparent text-glow-ink ${slides ? '' : 'bg-glow'}`
          : 'border-line text-bone hover:border-mute'
      }`}
    >
      {children}
      <span className={`text-xs tabular-nums ${active ? 'text-glow-ink/70' : 'text-mute'}`}>{count}</span>
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
