-- RLS for tournament_team_members
alter table public.tournament_team_members enable row level security;

create policy "Authenticated users can view team members"
  on public.tournament_team_members for select
  to authenticated
  using (true);

create policy "Authenticated users can manage team members"
  on public.tournament_team_members for all
  to authenticated
  using (true)
  with check (true);
