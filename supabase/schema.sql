-- Wall Vault: Supabase setup script (fresh install)
-- Run once in Supabase Dashboard > SQL Editor > New query.
--
-- BEFORE RUNNING: replace REPLACE_WITH_YOUR_EMAIL below with the email of the
-- admin user you will create under Authentication > Users. Only that account
-- can upload, edit or delete wallpapers. Everyone else can only view them.
--
-- Already set up with an older version of this file? Run protect-originals.sql instead.

-- 1. Admin check ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'REPLACE_WITH_YOUR_EMAIL';
$$;

-- 2. Wallpapers table -------------------------------------------------------
create table if not exists public.wallpapers (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  tags          text[] not null default '{}',
  original_path text,             -- full-size original in the PRIVATE "originals" bucket
  file_path     text,             -- old uploads only: original in the public bucket
  thumb_path    text not null,    -- small preview shown in the gallery (public)
  width         integer not null check (width > 0),
  height        integer not null check (height > 0),
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

create index if not exists wallpapers_created_at_idx
  on public.wallpapers (created_at desc);
create index if not exists wallpapers_tags_idx
  on public.wallpapers using gin (tags);

alter table public.wallpapers enable row level security;

drop policy if exists "Anyone can view wallpapers" on public.wallpapers;
create policy "Anyone can view wallpapers"
  on public.wallpapers for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can add wallpapers" on public.wallpapers;
create policy "Admin can add wallpapers"
  on public.wallpapers for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admin can edit wallpapers" on public.wallpapers;
create policy "Admin can edit wallpapers"
  on public.wallpapers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin can delete wallpapers" on public.wallpapers;
create policy "Admin can delete wallpapers"
  on public.wallpapers for delete
  to authenticated
  using (public.is_admin());

-- The public can read everything except where the private originals are stored.
revoke select on public.wallpapers from anon, authenticated;
grant select (id, title, tags, file_path, thumb_path, width, height, size_bytes, created_at)
  on public.wallpapers to anon;
grant select on public.wallpapers to authenticated;

-- 3. Storage ----------------------------------------------------------------
-- "wallpapers" is public and only holds small previews.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wallpapers',
  'wallpapers',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- "originals" is private. 50 MB is the per-file cap on the free plan.
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

-- Previews bucket policies
drop policy if exists "Anyone can view wallpaper files" on storage.objects;
create policy "Anyone can view wallpaper files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'wallpapers');

drop policy if exists "Admin can upload wallpaper files" on storage.objects;
create policy "Admin can upload wallpaper files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wallpapers' and public.is_admin());

drop policy if exists "Admin can replace wallpaper files" on storage.objects;
create policy "Admin can replace wallpaper files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'wallpapers' and public.is_admin());

drop policy if exists "Admin can delete wallpaper files" on storage.objects;
create policy "Admin can delete wallpaper files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'wallpapers' and public.is_admin());

-- Originals bucket policies (admin only; visitors get a one-minute link from the website)
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
