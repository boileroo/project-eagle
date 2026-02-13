-- Add missing DELETE policy for tournaments
-- Only the creator can delete their own tournament

create policy "Tournament creator can delete"
  on public.tournaments for delete
  to authenticated
  using (created_by_user_id = auth.uid());
