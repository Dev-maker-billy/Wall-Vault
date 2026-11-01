'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Wallpaper } from '@/lib/types';
import { storageUrl } from '@/lib/storage';
import { GROUPS, PRESETS } from '@/lib/presets';
import {
  MAX_PIXELS,
  MAX_SIDE,
  computeCrop,
  renderWallpaper,
  saveBlob,
  slugify,
  type OutputFormat,
} from '@/lib/resize';

type Props = {
  wallpaper: Wallpaper;
  onClose: () => void;
};

type Target = { w: number; h: number };

export default function DownloadModal({ wallpaper, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [choice, setChoice] = useState<string>(wallpaper.height > wallpaper.width ? 'phone' : 'fhd');
  const [customW, setCustomW] = useState('1920');
  const [customH, setCustomH] = useState('1080');
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  // Open as a native modal dialog: focus trap and Escape come for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Track the preview area so the image can be fitted to it.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setStage({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resolve the chosen size, or explain why a custom size can't be used.
  const { target, customError } = useMemo((): { target: Target | null; customError: string | null } => {
    if (choice !== 'custom') {
      const preset = PRESETS.find((p) => p.id === choice);
      return { target: preset ? { w: preset.width, h: preset.height } : null, customError: null };
    }
    const w = Number(customW);
    const h = Number(customH);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
      return { target: null, customError: 'Enter a width and height in whole pixels.' };
    }
    if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS) {
      return {
        target: null,
        customError: `Keep each side under ${MAX_SIDE.toLocaleString()} px and the total under 16 megapixels.`,
      };
    }
    return { target: { w, h }, customError: null };
  }, [choice, customW, customH]);

  // Preview geometry: where the image sits in the stage, and which part of it survives the crop.
  const pad = 24;
  const scale =
    stage.w > 0 && stage.h > 0
      ? Math.min((stage.w - pad * 2) / wallpaper.width, (stage.h - pad * 2) / wallpaper.height)
      : 0;
  const shownW = wallpaper.width * scale;
  const shownH = wallpaper.height * scale;
  const crop = target ? computeCrop(wallpaper.width, wallpaper.height, target.w, target.h) : null;

  const upscaled = target && crop ? crop.sw < target.w || crop.sh < target.h : false;

  async function handleDownload() {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      // Private originals come through a link that expires after a minute. Older uploads that
      // haven't been made private yet still use their public address.
      let source: string;
      if (wallpaper.file_path) {
        source = storageUrl(wallpaper.file_path);
      } else {
        const res = await fetch(`/api/original?id=${encodeURIComponent(wallpaper.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('link');
        source = (await res.json()).url as string;
      }
      const blob = await renderWallpaper(source, target.w, target.h, format);
      const ext = format === 'png' ? 'png' : 'jpg';
      saveBlob(blob, `${slugify(wallpaper.title)}-${target.w}x${target.h}.${ext}`);
      setDone(`Saved ${target.w} × ${target.h} as ${ext.toUpperCase()}.`);
    } catch {
      setError("Couldn't create the image. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="download-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[min(1120px,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-line bg-panel p-0 text-bone"
    >
      <div className="grid max-h-[calc(100dvh-1rem)] grid-rows-[minmax(0,36dvh)_minmax(0,1fr)] md:h-[min(740px,calc(100dvh-1rem))] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-1">
        {/* Preview with live crop frame */}
        <div ref={stageRef} className="relative flex items-center justify-center bg-ink">
          {scale > 0 && (
            <div className="relative overflow-hidden" style={{ width: shownW, height: shownH }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={storageUrl(wallpaper.thumb_path)}
                alt=""
                className="block h-full w-full select-none"
                draggable={false}
              />
              {crop && (
                <div
                  aria-hidden="true"
                  className="absolute border-2 border-glow shadow-[0_0_0_9999px_rgba(5,7,14,0.74)] transition-[left,top,width,height] duration-300 ease-out"
                  style={{
                    left: crop.sx * scale,
                    top: crop.sy * scale,
                    width: crop.sw * scale,
                    height: crop.sh * scale,
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="flex min-h-0 flex-col overflow-y-auto border-t border-line md:border-l md:border-t-0">
          <div className="flex items-start justify-between gap-3 p-5 pb-4">
            <div className="min-w-0">
              <h2 id="download-title" className="truncate font-display text-lg font-bold">
                {wallpaper.title}
              </h2>
              <p className="mt-1 text-sm text-mute">
                Original {wallpaper.width.toLocaleString()} × {wallpaper.height.toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="btn-quiet shrink-0"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-5 px-5 pb-5">
            {GROUPS.map((group) => {
              const presets = PRESETS.filter((p) => p.group === group);
              return (
                <fieldset key={group}>
                  <legend className="mb-2 text-sm font-semibold text-mute">{group}</legend>
                  <div className={`grid gap-2 ${presets.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {presets.map((p) => (
                      <SizeCard
                        key={p.id}
                        checked={choice === p.id}
                        onChange={() => setChoice(p.id)}
                        label={p.label}
                        dims={`${p.width} × ${p.height}`}
                        w={p.width}
                        h={p.height}
                      />
                    ))}
                  </div>
                </fieldset>
              );
            })}

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-mute">Custom</legend>
              <label
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-glow ${
                  choice === 'custom' ? 'border-glow bg-ink' : 'border-line hover:border-mute'
                }`}
              >
                <input
                  type="radio"
                  name="size"
                  checked={choice === 'custom'}
                  onChange={() => setChoice('custom')}
                  className="sr-only"
                />
                <span className="font-medium">Your own size</span>
                <span className="text-mute">Width × height in pixels</span>
              </label>
              {choice === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex-1">
                    <span className="sr-only">Width in pixels</span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={customW}
                      onChange={(e) => setCustomW(e.target.value.replace(/\D/g, ''))}
                      placeholder="Width"
                    />
                  </label>
                  <span aria-hidden="true" className="text-mute">
                    ×
                  </span>
                  <label className="flex-1">
                    <span className="sr-only">Height in pixels</span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={customH}
                      onChange={(e) => setCustomH(e.target.value.replace(/\D/g, ''))}
                      placeholder="Height"
                    />
                  </label>
                </div>
              )}
              {customError && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {customError}
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-mute">File type</legend>
              <div className="grid grid-cols-2 rounded-lg border border-line p-1">
                <FormatButton active={format === 'jpeg'} onClick={() => setFormat('jpeg')}>
                  JPG, smaller
                </FormatButton>
                <FormatButton active={format === 'png'} onClick={() => setFormat('png')}>
                  PNG, lossless
                </FormatButton>
              </div>
            </fieldset>
          </div>

          <div className="sticky bottom-0 border-t border-line bg-panel p-5">
            {upscaled && target && (
              <p className="mb-3 text-sm text-mute">
                The original is smaller than {target.w} × {target.h}, so it will be enlarged and may
                look soft.
              </p>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!target || busy}
              className="btn-primary w-full py-3"
            >
              {busy ? 'Preparing image…' : target ? `Download ${target.w} × ${target.h}` : 'Choose a size'}
            </button>
            <div aria-live="polite" className="min-h-5 pt-2 text-sm">
              {error && <p className="text-danger">{error}</p>}
              {done && !error && <p className="text-mute">{done}</p>}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** A size choice drawn as a small outline in the same shape as the screen it produces. */
function SizeCard({
  checked,
  onChange,
  label,
  dims,
  w,
  h,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  dims: string;
  w: number;
  h: number;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-glow ${
        checked ? 'border-glow bg-ink text-glow' : 'border-line text-mute hover:border-mute'
      }`}
    >
      <input type="radio" name="size" checked={checked} onChange={onChange} className="sr-only" />
      <span aria-hidden="true" className="flex h-8 items-center">
        <span
          className="block rounded-[3px] border-[1.5px] border-current"
          style={{ height: 28, aspectRatio: `${w} / ${h}` }}
        />
      </span>
      <span className="text-sm font-medium text-bone">{label}</span>
      <span className="text-xs tabular-nums text-mute">{dims}</span>
    </label>
  );
}

function FormatButton({
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
      className={`rounded-md px-3 py-2 text-sm ${
        active ? 'bg-ink font-medium text-bone' : 'text-mute hover:text-bone'
      }`}
    >
      {children}
    </button>
  );
}
