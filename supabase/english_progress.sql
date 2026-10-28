-- English Practice: cloud progress sync
-- Run once in Supabase SQL Editor (same project as LESICHI)

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
