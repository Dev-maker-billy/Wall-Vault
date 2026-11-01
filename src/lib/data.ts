import { createClient } from '@supabase/supabase-js';
import type { Wallpaper } from './types';

export type WallpaperResult = {
  items: Wallpaper[];
  configured: boolean;
  error: string | null;
};

/** Server-side read used by the homepage. Never throws, so a bad deploy still renders a page. */
export async function fetchWallpapers(): Promise<WallpaperResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { items: [], configured: false, error: null };

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('wallpapers')
      // Named columns only: visitors are not allowed to read where private originals are stored.
      .select('id,title,tags,file_path,thumb_path,width,height,size_bytes,created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return { items: [], configured: true, error: error.message };
    return { items: (data ?? []) as Wallpaper[], configured: true, error: null };
  } catch (e) {
    return {
      items: [],
      configured: true,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
