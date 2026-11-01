import Gallery from '@/components/Gallery';
import HeroFrames from '@/components/HeroFrames';
import { fetchWallpapers } from '@/lib/data';

// Re-fetch from Supabase at most once a minute. Keeps the page static and fast on Vercel's free tier.
export const revalidate = 60;

export default async function Home() {
  const { items, configured, error } = await fetchWallpapers();
  const featured = items[0];

  return (
    <main>
      <header className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="flex items-center justify-between py-5">
          <span className="font-display text-base font-bold tracking-tight">Wall Vault</span>
          {items.length > 0 && (
            <span className="text-sm text-mute">{items.length} wallpapers</span>
          )}
        </div>

        <div
          className={`grid items-center gap-10 pb-14 pt-6 sm:pt-12 ${
            featured ? 'lg:grid-cols-[1fr_minmax(0,600px)] lg:gap-16' : ''
          }`}
        >
          <div>
            <h1 className="font-display text-[2.4rem] font-bold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
              One wallpaper.
              <br />
              Every screen size.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-mute">
              Pick a wallpaper, then pick your screen. It downloads already cropped to the exact
              pixel size.
            </p>
            {featured && (
              <a href="#gallery" className="btn-primary mt-8 px-6 py-3">
                Browse wallpapers
              </a>
            )}
          </div>
          {featured && <HeroFrames wallpaper={featured} />}
        </div>
      </header>

      <Gallery wallpapers={items} configured={configured} error={error} />

      <footer className="mx-auto max-w-[1600px] border-t border-line px-4 py-8 text-sm text-mute sm:px-8">
        Made by <span className="font-semibold text-bone">Aman Singh</span>
      </footer>
    </main>
  );
}
