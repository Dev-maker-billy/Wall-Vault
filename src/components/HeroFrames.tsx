'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Wallpaper } from '@/lib/types';
import { storageUrl } from '@/lib/storage';

const SCREEN_RATIO = 16 / 9;

// The sizes the crop frame cycles through: the same ones the download modal offers.
const SHAPES = [
  { label: 'Full HD', w: 1920, h: 1080 },
  { label: 'Phone', w: 1080, h: 1920 },
  { label: 'Square', w: 1080, h: 1080 },
  { label: 'Tall phone', w: 1440, h: 3200 },
];

// Rule-of-thirds guide lines, so the frame reads as a crop tool.
const LINE = 'rgba(237, 235, 248, 0.22)';
const thirds = (direction: 'to right' | 'to bottom') =>
  `linear-gradient(${direction}, transparent calc(33.333% - 0.5px), ${LINE} calc(33.333% - 0.5px), ${LINE} calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), ${LINE} calc(66.666% - 0.5px), ${LINE} calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px))`;
const THIRDS_GRID = `${thirds('to right')}, ${thirds('to bottom')}`;

const handle = 'absolute h-2 w-2 bg-glow';

/**
 * One wallpaper shown on a monitor and a phone at once. A crop frame on the monitor keeps
 * changing shape to show what each download size keeps. On a mouse, the frames tilt with the pointer.
 */
export default function HeroFrames({ wallpaper }: { wallpaper: Wallpaper }) {
  const src = storageUrl(wallpaper.thumb_path);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    if (query.matches) {
      setStep(1);
      return;
    }
    // Hold on the full frame while the entrance plays, then start cycling.
    const id = window.setInterval(() => setStep((s) => (s + 1) % SHAPES.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || reduced || !tiltRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current.style.setProperty('--rx', x.toFixed(3));
    tiltRef.current.style.setProperty('--ry', y.toFixed(3));
  }

  function onPointerLeave() {
    tiltRef.current?.style.setProperty('--rx', '0');
    tiltRef.current?.style.setProperty('--ry', '0');
  }

  const shape = SHAPES[step];
  const ratio = shape.w / shape.h;
  const widthPct = ratio >= SCREEN_RATIO ? 100 : (ratio / SCREEN_RATIO) * 100;
  const heightPct = ratio >= SCREEN_RATIO ? (SCREEN_RATIO / ratio) * 100 : 100;

  return (
    <div
      aria-hidden="true"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="mx-auto w-full max-w-[640px]"
      style={{ perspective: 1100 }}
    >
      <div
        ref={tiltRef}
        className="relative pb-12 pr-[9%]"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(calc(var(--ry, 0) * -7deg)) rotateY(calc(var(--rx, 0) * 9deg))',
          transition: 'transform 0.25s ease-out',
        }}
      >
        <div className="hero-rise">
          <div className="rounded-2xl border border-line bg-panel p-2.5">
            <div className="watermark relative aspect-video overflow-hidden rounded-lg bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <div
                className="absolute left-1/2 top-1/2 border-2 border-glow shadow-[0_0_0_9999px_rgba(5,7,14,0.72)]"
                style={{
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundImage: THIRDS_GRID,
                  transition:
                    'width 0.8s cubic-bezier(0.6, 0, 0.2, 1), height 0.8s cubic-bezier(0.6, 0, 0.2, 1)',
                }}
              >
                <span className={`${handle} -left-[5px] -top-[5px]`} />
                <span className={`${handle} -right-[5px] -top-[5px]`} />
                <span className={`${handle} -bottom-[5px] -left-[5px]`} />
                <span className={`${handle} -bottom-[5px] -right-[5px]`} />
              </div>
            </div>
          </div>
          <div className="mx-auto h-3 w-24 rounded-b-md bg-line" />
        </div>

        <p key={step} className="swap absolute bottom-2 left-1 text-sm tabular-nums text-mute">
          {shape.label}, {shape.w} × {shape.h}
        </p>

        <div className="hero-rise-late absolute bottom-0 right-0 w-[27%] min-w-[84px]">
          <div
            style={{
              transform: 'translate3d(calc(var(--rx, 0) * -18px), calc(var(--ry, 0) * -12px), 40px)',
              transition: 'transform 0.25s ease-out',
            }}
          >
            <div className="float">
              <div className="rounded-[1.6rem] border border-line bg-panel p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]">
                <div className="watermark relative aspect-[9/19.5] overflow-hidden rounded-[1.25rem] bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
