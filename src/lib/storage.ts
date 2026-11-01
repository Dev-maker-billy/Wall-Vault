export const BUCKET = 'wallpapers';

/** Public URL for an object in the wallpapers bucket. Paths are uuid based, so no encoding is needed. */
export function storageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
