-- Migration: Add round format label + bonus mode support
-- Run with: npx tsx scripts/run-sql.ts supabase/migrate-round-format-bonus-mode.sql

-- 1. Add optional format text field to rounds
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS format text;

-- 2. No schema changes needed for bonus mode — it's stored inside configJson (jsonb)
--    The bonusMode and bonusPoints fields are part of the NTP/LD competition config.
