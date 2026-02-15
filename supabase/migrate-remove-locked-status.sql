-- Migration: Remove 'locked' status from round_status enum
-- Any rounds currently 'locked' become 'open' (so commissioners can finalize or reopen)

-- 1. Move any locked rounds to open
UPDATE rounds SET status = 'open' WHERE status = 'locked';

-- 2. Recreate the enum without 'locked'
-- Postgres doesn't support DROP VALUE from enum, so we need to:
-- a) Create a new enum type
-- b) Swap columns to use it
-- c) Drop the old type

CREATE TYPE round_status_new AS ENUM ('draft', 'open', 'finalized');

ALTER TABLE rounds
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE round_status_new USING status::text::round_status_new,
  ALTER COLUMN status SET DEFAULT 'draft';

DROP TYPE round_status;
ALTER TYPE round_status_new RENAME TO round_status;
