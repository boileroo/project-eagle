-- ============================================================
-- Project Eagle: Supabase-side setup
-- Run once via the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. Auto-create a profile when a user signs up
-- ──────────────────────────────────────────────

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

-- Drop if exists so this script is idempotent
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ──────────────────────────────────────────────
-- 2. Row Level Security policies
-- ──────────────────────────────────────────────

-- Helper: current user's UUID
-- (auth.uid() is a built-in Supabase function)

-- ── profiles ──────────────────────────────────

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Insert is handled by the trigger, not by the client
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (true);  -- trigger runs as security definer


-- ── persons ───────────────────────────────────

alter table public.persons enable row level security;

create policy "Authenticated users can view persons"
  on public.persons for select
  to authenticated
  using (true);

-- Trigger inserts the user's own person; guests are inserted by their creator
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


-- ── courses & course_holes ────────────────────

alter table public.courses enable row level security;
alter table public.course_holes enable row level security;

-- Courses are a shared library — everyone can read
create policy "Anyone can view courses"
  on public.courses for select
  to authenticated
  using (true);

create policy "Authenticated users can create courses"
  on public.courses for insert
  to authenticated
  with check (true);

create policy "Course creator can update"
  on public.courses for update
  to authenticated
  using (created_by_user_id = auth.uid())
  with check (created_by_user_id = auth.uid());

create policy "Course creator can delete"
  on public.courses for delete
  to authenticated
  using (created_by_user_id = auth.uid());

create policy "Anyone can view course holes"
  on public.course_holes for select
  to authenticated
  using (true);

create policy "Course owner can insert holes"
  on public.course_holes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.courses
      where id = course_id and created_by_user_id = auth.uid()
    )
  );

create policy "Course owner can update holes"
  on public.course_holes for update
  to authenticated
  using (
    exists (
      select 1 from public.courses
      where id = course_id and created_by_user_id = auth.uid()
    )
  );

create policy "Course owner can delete holes"
  on public.course_holes for delete
  to authenticated
  using (
    exists (
      select 1 from public.courses
      where id = course_id and created_by_user_id = auth.uid()
    )
  );


-- ── tournaments ───────────────────────────────

alter table public.tournaments enable row level security;

create policy "Authenticated users can view tournaments"
  on public.tournaments for select
  to authenticated
  using (true);

create policy "Authenticated users can create tournaments"
  on public.tournaments for insert
  to authenticated
  with check (true);

create policy "Tournament creator can update"
  on public.tournaments for update
  to authenticated
  using (created_by_user_id = auth.uid());


-- ── rounds ────────────────────────────────────

alter table public.rounds enable row level security;

create policy "Authenticated users can view rounds"
  on public.rounds for select
  to authenticated
  using (true);

create policy "Authenticated users can create rounds"
  on public.rounds for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update rounds"
  on public.rounds for update
  to authenticated
  using (true);


-- ── tournament_participants ───────────────────

alter table public.tournament_participants enable row level security;

create policy "Authenticated users can view tournament participants"
  on public.tournament_participants for select
  to authenticated
  using (true);

create policy "Authenticated users can manage tournament participants"
  on public.tournament_participants for all
  to authenticated
  using (true)
  with check (true);


-- ── round_participants ────────────────────────

alter table public.round_participants enable row level security;

create policy "Authenticated users can view round participants"
  on public.round_participants for select
  to authenticated
  using (true);

create policy "Authenticated users can manage round participants"
  on public.round_participants for all
  to authenticated
  using (true)
  with check (true);


-- ── tournament_teams ──────────────────────────

alter table public.tournament_teams enable row level security;

create policy "Authenticated users can view tournament teams"
  on public.tournament_teams for select
  to authenticated
  using (true);

create policy "Authenticated users can manage tournament teams"
  on public.tournament_teams for all
  to authenticated
  using (true)
  with check (true);


-- ── round_teams ───────────────────────────────

alter table public.round_teams enable row level security;

create policy "Authenticated users can view round teams"
  on public.round_teams for select
  to authenticated
  using (true);

create policy "Authenticated users can manage round teams"
  on public.round_teams for all
  to authenticated
  using (true)
  with check (true);


-- ── round_team_members ────────────────────────

alter table public.round_team_members enable row level security;

create policy "Authenticated users can view round team members"
  on public.round_team_members for select
  to authenticated
  using (true);

create policy "Authenticated users can manage round team members"
  on public.round_team_members for all
  to authenticated
  using (true)
  with check (true);


-- ── score_events ──────────────────────────────

alter table public.score_events enable row level security;

create policy "Authenticated users can view score events"
  on public.score_events for select
  to authenticated
  using (true);

create policy "Authenticated users can insert score events"
  on public.score_events for insert
  to authenticated
  with check (true);

-- Score events are append-only — no update/delete policies


-- ── competitions ──────────────────────────────

alter table public.competitions enable row level security;

create policy "Authenticated users can view competitions"
  on public.competitions for select
  to authenticated
  using (true);

create policy "Authenticated users can manage competitions"
  on public.competitions for all
  to authenticated
  using (true)
  with check (true);
