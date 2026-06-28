-- Rename tables, columns, and enums to reflect the new data model.
-- Introduces: players, teams, team_members, groups, round_players, scores, games, decisions, side_games.
-- Removes: tournament_standings, bonus_awards, competition_category, group_scope, participant_type.

-- Step 1: Create the tournament_mode enum
CREATE TYPE "tournament_mode" AS ENUM ('individual', 'team');

-- Step 2: Add new columns to tournaments
ALTER TABLE "tournaments"
  ADD COLUMN "mode" "tournament_mode" NOT NULL DEFAULT 'individual',
  ADD COLUMN "track_individual_scoreboard" boolean NOT NULL DEFAULT true;

-- Step 3: Rename tournaments.primary_scoring_basis -> scoring_basis
ALTER TABLE "tournaments" RENAME COLUMN "primary_scoring_basis" TO "scoring_basis";

-- Step 4: Update rounds
ALTER TABLE "rounds" RENAME COLUMN "format" TO "label";
ALTER TABLE "rounds" DROP COLUMN "primary_scoring_basis";

-- Step 5: Drop deprecated tables
DROP TABLE IF EXISTS "bonus_awards";
DROP TABLE IF EXISTS "tournament_standings";

-- Step 6: Drop removed columns from competitions before renaming
ALTER TABLE "competitions" DROP COLUMN "competition_category";
ALTER TABLE "competitions" DROP COLUMN "group_scope";

-- Step 7: Rename columns (while tables still have their old names for clarity)
ALTER TABLE "tournament_team_members" RENAME COLUMN "participant_id" TO "player_id";
ALTER TABLE "round_participants" RENAME COLUMN "round_group_id" TO "group_id";
ALTER TABLE "round_participants" RENAME COLUMN "tournament_participant_id" TO "player_id";
ALTER TABLE "score_events" RENAME COLUMN "round_participant_id" TO "round_player_id";
ALTER TABLE "competitions" RENAME COLUMN "round_group_id" TO "group_id";
ALTER TABLE "competitions" RENAME COLUMN "format_type" TO "format";
ALTER TABLE "competitions" RENAME COLUMN "config_json" TO "config";
ALTER TABLE "game_decisions" RENAME COLUMN "competition_id" TO "game_id";
ALTER TABLE "game_decisions" RENAME COLUMN "round_group_id" TO "group_id";

-- Step 8: Rename tables
ALTER TABLE "tournament_participants" RENAME TO "players";
ALTER TABLE "tournament_teams" RENAME TO "teams";
ALTER TABLE "tournament_team_members" RENAME TO "team_members";
ALTER TABLE "round_groups" RENAME TO "groups";
ALTER TABLE "round_participants" RENAME TO "round_players";
ALTER TABLE "score_events" RENAME TO "scores";
ALTER TABLE "competitions" RENAME TO "games";
ALTER TABLE "game_decisions" RENAME TO "decisions";

-- Step 9: Rename unique indexes to match new table/column names
ALTER INDEX "tournament_participants_tournament_person_unique" RENAME TO "players_tournament_person_unique";
ALTER INDEX "tournament_team_members_team_participant_unique" RENAME TO "team_members_team_player_unique";
ALTER INDEX "round_groups_round_group_unique" RENAME TO "groups_round_group_unique";
ALTER INDEX "round_participants_round_person_unique" RENAME TO "round_players_round_person_unique";

-- Step 10: Create the side_games table
CREATE TABLE "side_games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tournament_id" uuid NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "round_id" uuid NOT NULL REFERENCES "rounds"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "format" text NOT NULL,
  "hole_number" integer,
  "bonus_mode" text,
  "bonus_points" integer,
  "winner_id" uuid REFERENCES "round_players"("id") ON DELETE SET NULL,
  "awarded_by_user_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Step 11: Drop now-unused enums
DROP TYPE IF EXISTS "competition_category";
DROP TYPE IF EXISTS "group_scope";
DROP TYPE IF EXISTS "participant_type";
