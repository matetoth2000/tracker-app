-- Milestone 2.1: replace usage_events/usage_event_tags with daily_usage and allocations

-- Drop old dependent tables first
drop table if exists usage_event_tags cascade;
drop table if exists usage_events cascade;

-- Daily usage records (per user, per habit, per day)
create table if not exists daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  habit_id uuid not null references habits (id) on delete cascade,
  date date not null,
  quantity numeric not null check (quantity >= 0),
  mood smallint null check (mood is null or mood between 1 and 10),
  craving smallint null check (craving is null or craving between 1 and 10),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, habit_id, date)
);

create index if not exists daily_usage_user_habit_date_idx
  on daily_usage (user_id, habit_id, date desc);

-- Allocations of daily usage to tags
create table if not exists daily_usage_tag_allocations (
  daily_usage_id uuid not null references daily_usage (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  quantity numeric not null check (quantity >= 0),
  created_at timestamptz default now(),
  primary key (daily_usage_id, tag_id)
);

-- Enable RLS
alter table daily_usage enable row level security;
alter table daily_usage_tag_allocations enable row level security;

-- daily_usage policies: per-user isolation
create policy "Daily usage select own" on daily_usage
  for select using (user_id = auth.uid()); -- read only own rows

create policy "Daily usage insert own" on daily_usage
  for insert with check (user_id = auth.uid()); -- create only for self

create policy "Daily usage update own" on daily_usage
  for update using (user_id = auth.uid()) with check (user_id = auth.uid()); -- update only own

create policy "Daily usage delete own" on daily_usage
  for delete using (user_id = auth.uid()); -- delete only own

-- daily_usage_tag_allocations policies: both daily_usage and tag must belong to user
create policy "Daily usage tag allocations select own" on daily_usage_tag_allocations
  for select using (
    exists (
      select 1
      from daily_usage du
      where du.id = daily_usage_tag_allocations.daily_usage_id
        and du.user_id = auth.uid()
    )
    and exists (
      select 1
      from tags t
      where t.id = daily_usage_tag_allocations.tag_id
        and t.user_id = auth.uid()
    )
  ); -- read only when both linked records belong to user

create policy "Daily usage tag allocations insert own" on daily_usage_tag_allocations
  for insert with check (
    exists (
      select 1
      from daily_usage du
      where du.id = daily_usage_id
        and du.user_id = auth.uid()
    )
    and exists (
      select 1
      from tags t
      where t.id = tag_id
        and t.user_id = auth.uid()
    )
  ); -- create only when both linked records belong to user

create policy "Daily usage tag allocations update own" on daily_usage_tag_allocations
  for update using (
    exists (
      select 1
      from daily_usage du
      where du.id = daily_usage_tag_allocations.daily_usage_id
        and du.user_id = auth.uid()
    )
    and exists (
      select 1
      from tags t
      where t.id = daily_usage_tag_allocations.tag_id
        and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from daily_usage du
      where du.id = daily_usage_id
        and du.user_id = auth.uid()
    )
    and exists (
      select 1
      from tags t
      where t.id = tag_id
        and t.user_id = auth.uid()
    )
  ); -- update only when both linked records belong to user

create policy "Daily usage tag allocations delete own" on daily_usage_tag_allocations
  for delete using (
    exists (
      select 1
      from daily_usage du
      where du.id = daily_usage_tag_allocations.daily_usage_id
        and du.user_id = auth.uid()
    )
    and exists (
      select 1
      from tags t
      where t.id = daily_usage_tag_allocations.tag_id
        and t.user_id = auth.uid()
    )
  ); -- delete only when both linked records belong to user
