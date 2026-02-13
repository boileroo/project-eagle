-- ============================================================
-- Migration: Update signup trigger to auto-create person,
-- and update persons RLS for new ownership model.
-- Run once via Supabase SQL Editor or run-sql.ts
-- ============================================================

-- 1. Update the trigger to also create a person record on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );

  -- Auto-create a person record so every user is a "player"
  insert into public.persons (display_name, user_id, created_by_user_id)
  values (
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.id,
    new.id
  );

  return new;
end;
$$;

-- 2. Drop old persons RLS policies
drop policy if exists "Authenticated users can create persons" on public.persons;
drop policy if exists "Person owner can update" on public.persons;
drop policy if exists "Person owner can delete" on public.persons;
drop policy if exists "Users can manage their own persons" on public.persons;

-- 3. Create new RLS policies

-- Trigger inserts the user's own person; guests inserted by creator
create policy "Insert own or guest persons"
  on public.persons for insert
  to authenticated
  with check (true);  -- trigger runs as security definer; app-level checks for guests

-- Users can update their own person record
create policy "Users can update own person"
  on public.persons for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Creator can update guest persons they created
create policy "Creator can update guest persons"
  on public.persons for update
  to authenticated
  using (user_id is null and created_by_user_id = auth.uid())
  with check (user_id is null and created_by_user_id = auth.uid());

-- Creator can delete guest persons they created
create policy "Creator can delete guest persons"
  on public.persons for delete
  to authenticated
  using (user_id is null and created_by_user_id = auth.uid());

-- 4. Backfill: create person records for existing users that don't have one
insert into public.persons (display_name, user_id, created_by_user_id)
select
  coalesce(p.display_name, p.email),
  p.id,
  p.id
from public.profiles p
where not exists (
  select 1 from public.persons per where per.user_id = p.id
);
