import Gallery from '@/components/Gallery';
import { fetchWallpapers } from '@/lib/data';

// Re-fetch from Supabase at most once a minute. Keeps the page static and fast on Vercel's free tier.
export const revalidate = 60;

export default async function Home() {
  const { items, configured, error } = await fetchWallpapers();

  return (
    <main>
      <header className="mx-auto max-w-[1600px] px-4 pb-8 pt-12 sm:px-8 sm:pt-16">
        <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
          Wall Vault
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-mute">
          Pick a wallpaper, pick your screen. It downloads cropped to the exact size you need.
        </p>
      </header>
      <Gallery wallpapers={items} configured={configured} error={error} />
    </main>
  );
}
