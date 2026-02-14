-- Competition refactor: drop scope, add participantType, add tournamentStandings
-- Run this manually, then run `npx drizzle-kit push` to verify schema is in sync.

-- 1. Create the new participant_type enum
CREATE TYPE participant_type AS ENUM ('individual', 'team');

-- 2. Add participant_type column to competitions (default 'individual')
ALTER TABLE competitions
  ADD COLUMN participant_type participant_type NOT NULL DEFAULT 'individual';

-- 3. Make round_id NOT NULL (first set any nulls to a valid value, then alter)
-- If there are tournament-scoped competitions with null round_id, delete them first
DELETE FROM competitions WHERE round_id IS NULL;
ALTER TABLE competitions ALTER COLUMN round_id SET NOT NULL;

-- 4. Drop scope column and enum
ALTER TABLE competitions DROP COLUMN scope;
DROP TYPE IF EXISTS competition_scope;

-- 5. Create tournament_standings table
CREATE TABLE IF NOT EXISTS tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  participant_type participant_type NOT NULL,
  aggregation_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
