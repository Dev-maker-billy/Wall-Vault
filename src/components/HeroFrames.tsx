import type { Wallpaper } from '@/lib/types';
import { storageUrl } from '@/lib/storage';

/**
 * One wallpaper shown on a monitor and a phone at once.
 * Each frame crops the same image to its own shape, which is what the site does on download.
 */
export default function HeroFrames({ wallpaper }: { wallpaper: Wallpaper }) {
  const src = storageUrl(wallpaper.thumb_path);

  return (
    <div className="relative mx-auto w-full max-w-[640px] pb-12 pr-[9%]" aria-hidden="true">
      <div className="hero-rise">
        <div className="rounded-2xl border border-line bg-panel p-2.5">
          <div className="aspect-video overflow-hidden rounded-lg bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="mx-auto h-3 w-24 rounded-b-md bg-line" />
      </div>

      <div className="hero-rise-late absolute bottom-0 right-0 w-[27%] min-w-[84px]">
        <div className="rounded-[1.6rem] border border-line bg-panel p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]">
          <div className="aspect-[9/19.5] overflow-hidden rounded-[1.25rem] bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}
