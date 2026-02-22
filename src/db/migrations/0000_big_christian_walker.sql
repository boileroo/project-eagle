CREATE TYPE "public"."competition_category" AS ENUM('match', 'game', 'bonus');--> statement-breakpoint
CREATE TYPE "public"."group_scope" AS ENUM('all', 'within_group');--> statement-breakpoint
CREATE TYPE "public"."participant_type" AS ENUM('individual', 'team');--> statement-breakpoint
CREATE TYPE "public"."primary_scoring_basis" AS ENUM('gross_strokes', 'net_strokes', 'stableford', 'total');--> statement-breakpoint
CREATE TYPE "public"."recorded_by_role" AS ENUM('player', 'marker', 'commissioner');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('draft', 'scheduled', 'open', 'finalized');--> statement-breakpoint
CREATE TYPE "public"."tournament_role" AS ENUM('commissioner', 'marker', 'player');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('setup', 'scheduled', 'underway', 'complete');--> statement-breakpoint
CREATE TABLE "bonus_awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"round_participant_id" uuid NOT NULL,
	"awarded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"name" text NOT NULL,
	"competition_category" "competition_category" NOT NULL,
	"group_scope" "group_scope" DEFAULT 'all' NOT NULL,
	"format_type" text NOT NULL,
	"config_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_holes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"hole_number" integer NOT NULL,
	"par" integer NOT NULL,
	"stroke_index" integer NOT NULL,
	"yardage" integer
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"number_of_holes" integer DEFAULT 18 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"user_id" uuid,
	"created_by_user_id" uuid,
	"current_handicap" numeric(4, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persons_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "round_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"group_number" integer NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"round_group_id" uuid,
	"person_id" uuid NOT NULL,
	"tournament_participant_id" uuid,
	"handicap_snapshot" numeric(4, 1) NOT NULL,
	"handicap_override" numeric(4, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"round_number" integer,
	"date" timestamp with time zone,
	"tee_time" text,
	"format" text,
	"status" "round_status" DEFAULT 'draft' NOT NULL,
	"primary_scoring_basis" "primary_scoring_basis",
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"round_participant_id" uuid NOT NULL,
	"hole_number" integer NOT NULL,
	"strokes" integer NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_by_role" "recorded_by_role" NOT NULL,
	"device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" "tournament_role" DEFAULT 'player' NOT NULL,
	"handicap_override" numeric(4, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"participant_type" "participant_type" NOT NULL,
	"aggregation_config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "tournament_status" DEFAULT 'setup' NOT NULL,
	"is_single_round" boolean DEFAULT false NOT NULL,
	"primary_scoring_basis" "primary_scoring_basis",
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bonus_awards" ADD CONSTRAINT "bonus_awards_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_awards" ADD CONSTRAINT "bonus_awards_round_participant_id_round_participants_id_fk" FOREIGN KEY ("round_participant_id") REFERENCES "public"."round_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_awards" ADD CONSTRAINT "bonus_awards_awarded_by_user_id_profiles_id_fk" FOREIGN KEY ("awarded_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_holes" ADD CONSTRAINT "course_holes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_decisions" ADD CONSTRAINT "game_decisions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_decisions" ADD CONSTRAINT "game_decisions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_decisions" ADD CONSTRAINT "game_decisions_recorded_by_user_id_profiles_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_groups" ADD CONSTRAINT "round_groups_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_participants" ADD CONSTRAINT "round_participants_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_participants" ADD CONSTRAINT "round_participants_round_group_id_round_groups_id_fk" FOREIGN KEY ("round_group_id") REFERENCES "public"."round_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_participants" ADD CONSTRAINT "round_participants_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_participants" ADD CONSTRAINT "round_participants_tournament_participant_id_tournament_participants_id_fk" FOREIGN KEY ("tournament_participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_round_participant_id_round_participants_id_fk" FOREIGN KEY ("round_participant_id") REFERENCES "public"."round_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_recorded_by_user_id_profiles_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_participant_id_tournament_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."tournament_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_holes_course_hole_unique" ON "course_holes" USING btree ("course_id","hole_number");--> statement-breakpoint
CREATE UNIQUE INDEX "round_groups_round_group_unique" ON "round_groups" USING btree ("round_id","group_number");--> statement-breakpoint
CREATE UNIQUE INDEX "round_participants_round_person_unique" ON "round_participants" USING btree ("round_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_participants_tournament_person_unique" ON "tournament_participants" USING btree ("tournament_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_team_members_team_participant_unique" ON "tournament_team_members" USING btree ("team_id","participant_id");