import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// Always run fresh: every link is unique and short-lived.
export const dynamic = 'force-dynamic';

const ORIGINALS_BUCKET = 'originals';
const LINK_SECONDS = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const noStore = { 'Cache-Control': 'no-store' };

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: noStore });
}

/**
 * Hands the browser a link to a private original that stops working after one minute.
 * It only answers requests that come from this site's own pages, so pasting the address
 * into another website, or opening it in a new tab, gets nothing.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!UUID.test(id)) return deny(400, 'bad_id');

  // Browsers label every request with where it came from. Anything not from this site is refused.
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return deny(403, 'forbidden');

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin !== request.nextUrl.origin) return deny(403, 'forbidden');
    } catch {
      return deny(403, 'forbidden');
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return deny(503, 'not_configured');

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: row, error } = await supabase
    .from('wallpapers')
    .select('original_path')
    .eq('id', id)
    .maybeSingle();
  if (error) return deny(500, 'lookup_failed');
  if (!row?.original_path) return deny(404, 'not_found');

  const { data, error: signError } = await supabase.storage
    .from(ORIGINALS_BUCKET)
    .createSignedUrl(row.original_path, LINK_SECONDS);
  if (signError || !data) return deny(500, 'sign_failed');

  return NextResponse.json({ url: data.signedUrl }, { headers: noStore });
}
