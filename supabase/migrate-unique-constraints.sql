-- Add unique constraints to prevent duplicates

ALTER TABLE course_holes
  ADD CONSTRAINT course_holes_course_hole_unique
  UNIQUE (course_id, hole_number);

ALTER TABLE tournament_participants
  ADD CONSTRAINT tournament_participants_tournament_person_unique
  UNIQUE (tournament_id, person_id);

ALTER TABLE tournament_team_members
  ADD CONSTRAINT tournament_team_members_team_participant_unique
  UNIQUE (team_id, participant_id);

ALTER TABLE round_groups
  ADD CONSTRAINT round_groups_round_group_unique
  UNIQUE (round_id, group_number);

ALTER TABLE round_participants
  ADD CONSTRAINT round_participants_round_person_unique
  UNIQUE (round_id, person_id);
