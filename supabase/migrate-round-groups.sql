-- Migration: Add round groups, groupScope on competitions, make rounds.tournament_id NOT NULL
-- Run via: yarn tsx scripts/run-sql.ts supabase/migrate-round-groups.sql

-- 1. Create group_scope enum
CREATE TYPE group_scope AS ENUM ('all', 'within_group');

-- 2. Create round_groups table
CREATE TABLE IF NOT EXISTS round_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  group_number INTEGER NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Add round_group_id to round_participants
ALTER TABLE round_participants
  ADD COLUMN round_group_id UUID REFERENCES round_groups(id) ON DELETE SET NULL;

-- 4. Add group_scope to competitions (default 'all')
ALTER TABLE competitions
  ADD COLUMN group_scope group_scope NOT NULL DEFAULT 'all';

-- 5. Make rounds.tournament_id NOT NULL
-- First, delete any orphan rounds with NULL tournament_id
DELETE FROM rounds WHERE tournament_id IS NULL;
-- Then set NOT NULL
ALTER TABLE rounds
  ALTER COLUMN tournament_id SET NOT NULL;

-- 6. RLS policies for round_groups
ALTER TABLE round_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view round_groups"
  ON round_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert round_groups"
  ON round_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update round_groups"
  ON round_groups FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete round_groups"
  ON round_groups FOR DELETE
  TO authenticated
  USING (true);
