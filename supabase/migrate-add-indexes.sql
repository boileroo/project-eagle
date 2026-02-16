-- Add indexes on high-traffic FK columns
-- All FK columns currently have zero indexes

-- persons
CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons (user_id);

-- courses
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses (created_by_user_id);

-- course_holes
CREATE INDEX IF NOT EXISTS idx_course_holes_course_id ON course_holes (course_id);

-- tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments (created_by_user_id);

-- tournament_participants
CREATE INDEX IF NOT EXISTS idx_tp_tournament_id ON tournament_participants (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tp_person_id ON tournament_participants (person_id);

-- tournament_teams
CREATE INDEX IF NOT EXISTS idx_tt_tournament_id ON tournament_teams (tournament_id);

-- tournament_team_members
CREATE INDEX IF NOT EXISTS idx_ttm_team_id ON tournament_team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_ttm_participant_id ON tournament_team_members (participant_id);

-- rounds
CREATE INDEX IF NOT EXISTS idx_rounds_tournament_id ON rounds (tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_course_id ON rounds (course_id);

-- round_groups
CREATE INDEX IF NOT EXISTS idx_round_groups_round_id ON round_groups (round_id);

-- round_participants
CREATE INDEX IF NOT EXISTS idx_rp_round_id ON round_participants (round_id);
CREATE INDEX IF NOT EXISTS idx_rp_person_id ON round_participants (person_id);
CREATE INDEX IF NOT EXISTS idx_rp_tournament_participant_id ON round_participants (tournament_participant_id);
CREATE INDEX IF NOT EXISTS idx_rp_round_group_id ON round_participants (round_group_id);

-- round_teams
CREATE INDEX IF NOT EXISTS idx_rt_round_id ON round_teams (round_id);
CREATE INDEX IF NOT EXISTS idx_rt_tournament_team_id ON round_teams (tournament_team_id);

-- round_team_members
CREATE INDEX IF NOT EXISTS idx_rtm_round_team_id ON round_team_members (round_team_id);
CREATE INDEX IF NOT EXISTS idx_rtm_round_participant_id ON round_team_members (round_participant_id);

-- score_events (highest-traffic table)
CREATE INDEX IF NOT EXISTS idx_se_round_id ON score_events (round_id);
CREATE INDEX IF NOT EXISTS idx_se_round_participant_id ON score_events (round_participant_id);
CREATE INDEX IF NOT EXISTS idx_se_recorded_by ON score_events (recorded_by_user_id);

-- competitions
CREATE INDEX IF NOT EXISTS idx_comp_tournament_id ON competitions (tournament_id);
CREATE INDEX IF NOT EXISTS idx_comp_round_id ON competitions (round_id);

-- bonus_awards
CREATE INDEX IF NOT EXISTS idx_ba_competition_id ON bonus_awards (competition_id);
CREATE INDEX IF NOT EXISTS idx_ba_round_participant_id ON bonus_awards (round_participant_id);
CREATE INDEX IF NOT EXISTS idx_ba_awarded_by ON bonus_awards (awarded_by_user_id);

-- tournament_standings
CREATE INDEX IF NOT EXISTS idx_ts_tournament_id ON tournament_standings (tournament_id);
