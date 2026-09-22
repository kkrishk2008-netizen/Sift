-- Sift schema. Run in Supabase Dashboard -> SQL Editor (or `supabase db push`).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- tasks: every inbox item (task / event / note)
-- `title` is the normalized English title; the person's own words live in `original_text`.
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type              text not null check (type in ('task', 'event', 'note')),
  title             text not null check (char_length(title) between 1 and 200),
  description       text not null default '',
  date              date,
  time              time,
  deadline          timestamptz,
  venue             text,
  priority          text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status            text not null default 'open'   check (status in ('open', 'done')),
  source            text not null default 'manual' check (source in ('image', 'voice', 'message', 'manual')),
  original_text     text not null default '',
  people            text[] not null default '{}',
  links             text[] not null default '{}',
  confidence        numeric(3, 2) not null default 0.70 check (confidence between 0 and 1),
  calendar_event_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists tasks_user_deadline_idx on public.tasks (user_id, deadline);
create index if not exists tasks_user_date_idx on public.tasks (user_id, date);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only ever see and change their own rows.
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own" on public.tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Anonymous product analytics: insert-only, no personal data, nobody can read it from the app.
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  anon_id    text not null check (char_length(anon_id) <= 64),
  event      text not null check (char_length(event) <= 40),
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_insert_any" on public.analytics_events;
create policy "analytics_insert_any" on public.analytics_events
  for insert to anon, authenticated with check (true);
-- (no select/update/delete policies on purpose)
