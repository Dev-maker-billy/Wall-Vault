-- Wall Vault: Supabase setup script
-- Run once in Supabase Dashboard > SQL Editor > New query.
--
-- BEFORE RUNNING: replace REPLACE_WITH_YOUR_EMAIL below with the email of the
-- admin user you will create under Authentication > Users. Only that account
-- can upload, edit or delete wallpapers. Everyone else can only view them.

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
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  tags        text[] not null default '{}',
  file_path   text not null,      -- original upload, e.g. <id>/original.jpg
  thumb_path  text not null,      -- small preview used by the gallery grid
  width       integer not null check (width > 0),
  height      integer not null check (height > 0),
  size_bytes  bigint,
  created_at  timestamptz not null default now()
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

-- 3. Storage bucket ---------------------------------------------------------
-- Public bucket so the browser can read originals directly (needed for the
-- client-side canvas resize). 50 MB is the per-file cap on the free plan.
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
