-- Migration: Round-level marker flag + remove stale participant_type from competitions
-- Run via the Supabase SQL Editor (Dashboard → SQL Editor)
-- This migration is idempotent — safe to run more than once.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add is_marker column to round_participants
--    Commissioners can designate a player as a round-level marker, which
--    grants them permission to record scores for others in their group.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE round_participants
  ADD COLUMN IF NOT EXISTS is_marker BOOLEAN NOT NULL DEFAULT false;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Reset any existing tournament-level marker roles to 'player'
--    The 'marker' value in tournament_role enum is now unused. All participants
--    previously assigned the 'marker' tournament role become plain 'player'.
--    The enum value itself cannot be removed from PostgreSQL without a full
--    type rebuild, so we leave it in the enum but never write it again.
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE tournament_participants
  SET role = 'player'
  WHERE role = 'marker';

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Drop the stale participant_type column from competitions
--    This column was added in a prior refactor (migrate-competition-refactor.sql)
--    but is no longer read or written by any application code. The same field
--    on tournament_standings remains and is unaffected.
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE competitions
  DROP COLUMN IF EXISTS participant_type;
