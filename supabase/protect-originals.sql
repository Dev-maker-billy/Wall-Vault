-- Wall Vault: make original files private
-- Run once in Supabase Dashboard > SQL Editor on a database that was set up with the
-- earlier schema.sql. It is safe to run twice. It does not touch is_admin(), so your
-- admin email stays as it is.
--
-- After this:
--   * Full-size originals live in a PRIVATE bucket called "originals".
--   * The website hands out a link that expires after one minute, only to its own pages.
--   * The public can no longer read where originals are stored.
--   * Old uploads keep working. Open the admin page and press "Make all private" to move them.

-- 1. New columns -------------------------------------------------------------
alter table public.wallpapers add column if not exists original_path text;
alter table public.wallpapers alter column file_path drop not null;

-- 2. Hide original_path from the public (column-level access) -----------------
revoke select on public.wallpapers from anon, authenticated;

grant select (id, title, tags, file_path, thumb_path, width, height, size_bytes, created_at)
  on public.wallpapers to anon;

grant select on public.wallpapers to authenticated;

-- 3. Private bucket for originals --------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'originals',
  'originals',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin can read originals" on storage.objects;
create policy "Admin can read originals"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'originals' and public.is_admin());

drop policy if exists "Admin can upload originals" on storage.objects;
create policy "Admin can upload originals"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'originals' and public.is_admin());

drop policy if exists "Admin can replace originals" on storage.objects;
create policy "Admin can replace originals"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'originals' and public.is_admin());

drop policy if exists "Admin can delete originals" on storage.objects;
create policy "Admin can delete originals"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'originals' and public.is_admin());

notify pgrst, 'reload schema';
