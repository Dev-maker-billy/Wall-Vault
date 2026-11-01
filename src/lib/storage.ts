/** Public bucket: small previews (and the originals of older uploads). */
export const BUCKET = 'wallpapers';
/** Private bucket: full-size originals, reachable only through short-lived links. */
export const ORIGINALS_BUCKET = 'originals';

/** Public URL for an object in the wallpapers bucket. Paths are uuid based, so no encoding is needed. */
export function storageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
