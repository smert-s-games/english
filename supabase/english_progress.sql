-- English Practice: progress DB (local mirror + Supabase)
-- Run in Supabase SQL Editor (same project as LESICHI)
-- Safe to re-run.

-- 1) Core table
create table if not exists public.english_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  learned jsonb not null default '{}'::jsonb,
  favorites jsonb not null default '{}'::jsonb,
  streak int not null default 0,
  last_visit date,
  quizzes_done int not null default 0,
  theme text default 'light',
  updated_at timestamptz not null default now()
);

-- 2) SRS fields (optional but recommended)
alter table public.english_progress
  add column if not exists activity jsonb not null default '{}'::jsonb,
  add column if not exists daily_new_limit int not null default 10,
  add column if not exists srs_migrated boolean not null default false;

comment on table public.english_progress is
  'Per-user progress. Words themselves live in static JS on GitHub Pages.';
comment on column public.english_progress.learned is
  'Map wordId → {level 0-5, due YYYY-MM-DD, lapses, lastSeen, note}. Legacy: true meant learned.';
comment on column public.english_progress.activity is
  'Map YYYY-MM-DD → review count (heatmap).';
comment on column public.english_progress.daily_new_limit is
  'Max new words per day (default 10).';

-- 3) updated_at trigger
create or replace function public.set_english_progress_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists english_progress_updated_at on public.english_progress;
create trigger english_progress_updated_at
  before update on public.english_progress
  for each row execute function public.set_english_progress_updated_at();

-- 4) RLS: only own row
alter table public.english_progress enable row level security;

drop policy if exists "english_progress_select_own" on public.english_progress;
drop policy if exists "english_progress_insert_own" on public.english_progress;
drop policy if exists "english_progress_update_own" on public.english_progress;

create policy "english_progress_select_own"
  on public.english_progress for select
  using (user_id = auth.uid());

create policy "english_progress_insert_own"
  on public.english_progress for insert
  with check (user_id = auth.uid());

create policy "english_progress_update_own"
  on public.english_progress for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.english_progress to authenticated;

-- 5) Client migrates learned values:
--    { "12": true }  →  { "12": { "level": 3, "due": "2026-10-30", "lapses": 0, "lastSeen": null, "note": "" } }
-- isLearned on client = level >= 4
