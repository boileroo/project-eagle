-- Add is_single_round flag to tournaments table
ALTER TABLE tournaments
  ADD COLUMN is_single_round boolean NOT NULL DEFAULT false;
