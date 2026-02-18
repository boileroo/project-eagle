-- Migration: Add tournament status and 'scheduled' round status
-- 
-- 1. Add 'scheduled' to round_status enum (draft → scheduled → open → finalized)
-- 2. Create tournament_status enum (setup, scheduled, underway, complete)
-- 3. Add status column to tournaments table
-- 4. Backfill existing tournament statuses based on child round statuses

-- ─────────────────────────────────────────────────────────────
-- 1. Add 'scheduled' to round_status enum
-- ─────────────────────────────────────────────────────────────
-- Postgres doesn't support inserting enum values at a specific position,
-- so we recreate the enum with the correct order.

CREATE TYPE round_status_new AS ENUM ('draft', 'scheduled', 'open', 'finalized');

ALTER TABLE rounds
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE round_status_new USING status::text::round_status_new,
  ALTER COLUMN status SET DEFAULT 'draft';

DROP TYPE round_status;
ALTER TYPE round_status_new RENAME TO round_status;

-- ─────────────────────────────────────────────────────────────
-- 2. Create tournament_status enum
-- ─────────────────────────────────────────────────────────────

CREATE TYPE tournament_status AS ENUM ('setup', 'scheduled', 'underway', 'complete');

-- ─────────────────────────────────────────────────────────────
-- 3. Add status column to tournaments
-- ─────────────────────────────────────────────────────────────

ALTER TABLE tournaments
  ADD COLUMN status tournament_status NOT NULL DEFAULT 'setup';

-- ─────────────────────────────────────────────────────────────
-- 4. Backfill existing tournament statuses
-- ─────────────────────────────────────────────────────────────
-- Logic (evaluated in order):
--   - If all rounds are 'finalized' (and at least one exists) → 'complete'
--   - If any round is 'open' or 'finalized' (mixed) → 'underway'
--   - If any round is 'scheduled' (none open/finalized) → 'scheduled'
--   - Otherwise → 'setup' (default, already set)

-- Mark tournaments as 'complete' if all rounds are finalized
UPDATE tournaments
SET status = 'complete'
WHERE id IN (
  SELECT tournament_id FROM rounds
  GROUP BY tournament_id
  HAVING COUNT(*) > 0
    AND COUNT(*) = COUNT(CASE WHEN status = 'finalized' THEN 1 END)
);

-- Mark tournaments as 'underway' if any round is open or finalized
-- (but not all finalized — those are already 'complete')
UPDATE tournaments
SET status = 'underway'
WHERE status != 'complete'
  AND id IN (
    SELECT DISTINCT tournament_id FROM rounds
    WHERE status IN ('open', 'finalized')
  );
