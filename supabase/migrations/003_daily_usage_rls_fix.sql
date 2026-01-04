-- RLS fix: ensure daily_usage references only habits owned by the current user

-- Drop previous daily_usage policies
drop policy if exists "Daily usage select own" on daily_usage;
drop policy if exists "Daily usage insert own" on daily_usage;
drop policy if exists "Daily usage update own" on daily_usage;
drop policy if exists "Daily usage delete own" on daily_usage;

-- Enforce both row ownership and habit ownership on all operations
create policy "Daily usage select own + habit ownership" on daily_usage
  for select using (
    user_id = auth.uid()
    and exists (
      select 1 from habits h where h.id = daily_usage.habit_id and h.user_id = auth.uid()
    )
  ); -- read only own rows that reference own habits

create policy "Daily usage insert own + habit ownership" on daily_usage
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()
    )
  ); -- create only for own user and own habits

create policy "Daily usage update own + habit ownership" on daily_usage
  for update using (
    user_id = auth.uid()
    and exists (
      select 1 from habits h where h.id = daily_usage.habit_id and h.user_id = auth.uid()
    )
  ) with check (
    user_id = auth.uid()
    and exists (
      select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()
    )
  ); -- update only own rows that reference own habits

create policy "Daily usage delete own + habit ownership" on daily_usage
  for delete using (
    user_id = auth.uid()
    and exists (
      select 1 from habits h where h.id = daily_usage.habit_id and h.user_id = auth.uid()
    )
  ); -- delete only own rows that reference own habits
