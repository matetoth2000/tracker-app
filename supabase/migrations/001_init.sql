-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles table mirrors auth.users
create table if not exists profiles (
  id uuid primary key references auth.users (id),
  display_name text,
  timezone text,
  created_at timestamptz default now()
);

-- Habits belong to a user; updated_at maintained via trigger
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  name text not null,
  unit text not null,
  default_quantity numeric,
  weekly_limit numeric,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, name)
);

-- Usage events tied to habits and users
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  habit_id uuid not null references habits (id) on delete cascade,
  timestamp timestamptz not null,
  quantity numeric not null,
  mood smallint,
  craving smallint,
  note text,
  created_at timestamptz default now()
);

create index if not exists usage_events_user_habit_timestamp_idx
  on usage_events (user_id, habit_id, timestamp desc);

-- Tags per user
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  name text not null,
  color text,
  created_at timestamptz default now(),
  unique (user_id, name)
);

-- Mapping between usage_events and tags
create table if not exists usage_event_tags (
  usage_event_id uuid not null references usage_events (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (usage_event_id, tag_id)
);

-- Trigger to keep habits.updated_at current
create or replace function set_habits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_habits_updated_at on habits;
create trigger set_habits_updated_at
before update on habits
for each row
execute procedure set_habits_updated_at();

-- Enable RLS
alter table profiles enable row level security;
alter table habits enable row level security;
alter table usage_events enable row level security;
alter table tags enable row level security;
alter table usage_event_tags enable row level security;

-- Profiles policies: owner-only access
create policy "Profiles select own" on profiles
  for select using (id = auth.uid()); -- only read own profile

create policy "Profiles insert own" on profiles
  for insert with check (id = auth.uid()); -- only create own profile

create policy "Profiles update own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid()); -- only update own profile

create policy "Profiles delete own" on profiles
  for delete using (id = auth.uid()); -- only delete own profile

-- Habits policies: per-user ownership
create policy "Habits select own" on habits
  for select using (user_id = auth.uid()); -- read only own habits

create policy "Habits insert own" on habits
  for insert with check (user_id = auth.uid()); -- create only for self

create policy "Habits update own" on habits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid()); -- update only own

create policy "Habits delete own" on habits
  for delete using (user_id = auth.uid()); -- delete only own

-- Usage events policies: enforce user ownership and habit ownership
create policy "Usage events select own" on usage_events
  for select using (user_id = auth.uid()); -- read only own events

create policy "Usage events insert own + habit ownership" on usage_events
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid())
  ); -- create only for own habit and user

create policy "Usage events update own + habit ownership" on usage_events
  for update using (
    user_id = auth.uid()
    and exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid())
  ) with check (
    user_id = auth.uid()
    and exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid())
  ); -- update only own and matching habit

create policy "Usage events delete own + habit ownership" on usage_events
  for delete using (
    user_id = auth.uid()
    and exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid())
  ); -- delete only own and matching habit

-- Tags policies: per-user ownership
create policy "Tags select own" on tags
  for select using (user_id = auth.uid()); -- read only own tags

create policy "Tags insert own" on tags
  for insert with check (user_id = auth.uid()); -- create only for self

create policy "Tags update own" on tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid()); -- update only own

create policy "Tags delete own" on tags
  for delete using (user_id = auth.uid()); -- delete only own

-- Usage_event_tags policies: both linked records must belong to the user
create policy "Usage event tags select own" on usage_event_tags
  for select using (
    exists (
      select 1
      from usage_events ue
      join tags t on t.id = usage_event_tags.tag_id
      where ue.id = usage_event_tags.usage_event_id
        and ue.user_id = auth.uid()
        and t.user_id = auth.uid()
    )
  ); -- read only when both usage_event and tag belong to user

create policy "Usage event tags insert own" on usage_event_tags
  for insert with check (
    exists (
      select 1
      from usage_events ue
      join tags t on t.id = tag_id
      where ue.id = usage_event_id
        and ue.user_id = auth.uid()
        and t.user_id = auth.uid()
    )
  ); -- create only when both referenced rows belong to user

create policy "Usage event tags update own" on usage_event_tags
  for update using (
    exists (
      select 1
      from usage_events ue
      join tags t on t.id = usage_event_tags.tag_id
      where ue.id = usage_event_tags.usage_event_id
        and ue.user_id = auth.uid()
        and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from usage_events ue
      join tags t on t.id = tag_id
      where ue.id = usage_event_id
        and ue.user_id = auth.uid()
        and t.user_id = auth.uid()
    )
  ); -- update only when both referenced rows belong to user

create policy "Usage event tags delete own" on usage_event_tags
  for delete using (
    exists (
      select 1
      from usage_events ue
      join tags t on t.id = usage_event_tags.tag_id
      where ue.id = usage_event_tags.usage_event_id
        and ue.user_id = auth.uid()
        and t.user_id = auth.uid()
    )
  ); -- delete only when both referenced rows belong to user
