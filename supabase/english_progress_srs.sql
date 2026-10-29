-- English Practice SRS migration (run in Supabase SQL Editor)
-- learned jsonb already stores progress; values change from true to objects.
-- No schema change required for basic SRS. Optional extras below.

-- Optional: activity heatmap + settings
alter table public.english_progress
  add column if not exists activity jsonb not null default '{}'::jsonb,
  add column if not exists daily_new_limit int not null default 10,
  add column if not exists srs_migrated boolean not null default false;

-- Client migrates learned: { "1": true } → { "1": { "level": 3, "due": "...", "lapses": 0, "lastSeen": null, "note": "" } }
-- isLearned on client = level >= 4

comment on column public.english_progress.learned is
  'Map wordId → true (legacy) or {level, due, lapses, lastSeen, note}';
