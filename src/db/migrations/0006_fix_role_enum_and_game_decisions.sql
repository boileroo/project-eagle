-- Fix role column type casting from text to tournament_role enum
-- Update any invalid values first, then cast with USING clause

UPDATE tournament_participants 
SET role = CASE 
  WHEN role IN ('commissioner', 'player') THEN role
  ELSE 'player' 
END;

ALTER TABLE tournament_participants 
ALTER COLUMN role TYPE tournament_role USING role::tournament_role;

-- Add roundGroupId to gameDecisions table
-- This is nullable to support existing decisions
ALTER TABLE game_decisions 
ADD COLUMN round_group_id UUID 
REFERENCES round_groups(id) ON DELETE CASCADE;

