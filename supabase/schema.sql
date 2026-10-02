-- Digital Footprint database setup.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- A memory: one moment in one country (a title, a note, a date).
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  country text not null,
  title text not null,
  note text,
  happened_on date,
  place text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_country_idx on public.memories (user_id, country);

-- The photos and videos attached to a memory. The files themselves live in Storage.
create table if not exists public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null,
  kind text not null check (kind in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists memory_media_memory_idx on public.memory_media (memory_id);

-- Each person can only see and change their own memories.
alter table public.memories enable row level security;
alter table public.memory_media enable row level security;

drop policy if exists "Own memories" on public.memories;
create policy "Own memories" on public.memories
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Own media" on public.memory_media;
create policy "Own media" on public.memory_media
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Private file bucket. Files are stored under "<user id>/<memory id>/<file>".
insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

drop policy if exists "Own files: read" on storage.objects;
create policy "Own files: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Own files: upload" on storage.objects;
create policy "Own files: upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Own files: delete" on storage.objects;
create policy "Own files: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);
