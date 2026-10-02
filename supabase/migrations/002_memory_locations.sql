-- Adds an exact location to each memory, so it can be pinned on the globe.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
alter table public.memories
  add column if not exists place text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;
