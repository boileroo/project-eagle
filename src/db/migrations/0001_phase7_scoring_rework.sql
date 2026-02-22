-- Phase 7 incremental migration
-- Adds: competition_category enum, primary_scoring_basis enum,
--       game_decisions table, competition_category column on competitions,
--       primary_scoring_basis columns on rounds + tournaments

CREATE TYPE "public"."competition_category" AS ENUM('match', 'game', 'bonus');
--> statement-breakpoint
CREATE TYPE "public"."primary_scoring_basis" AS ENUM('gross_strokes', 'net_strokes', 'stableford', 'total');
--> statement-breakpoint
CREATE TABLE "game_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"hole_number" integer NOT NULL,
	"data" jsonb NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "competition_category" "competition_category" NOT NULL DEFAULT 'game';
--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "primary_scoring_basis" "primary_scoring_basis";
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "primary_scoring_basis" "primary_scoring_basis";
--> statement-breakpoint
ALTER TABLE "game_decisions" ADD CONSTRAINT "game_decisions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_decisions" ADD CONSTRAINT "game_decisions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_decisions" ADD CONSTRAINT "game_decisions_recorded_by_user_id_profiles_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
