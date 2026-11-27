-- Become PM: saved progress for signed-in players.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.becomepm_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  best_grade text,
  cases jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.becomepm_progress enable row level security;

-- Each player can see and change only their own progress.
create policy "becomepm: read own progress" on public.becomepm_progress
  for select using (auth.uid() = user_id);
create policy "becomepm: add own progress" on public.becomepm_progress
  for insert with check (auth.uid() = user_id);
create policy "becomepm: update own progress" on public.becomepm_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
