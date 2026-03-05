-- Enable realtime for tournament_participants and round_participants tables
-- This allows Supabase Realtime subscriptions to broadcast changes to these tables

alter publication supabase_realtime add table tournament_participants;
alter publication supabase_realtime add table round_participants;
alter publication supabase_realtime add table rounds;
