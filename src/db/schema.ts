import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/** JSON-safe value type for jsonb columns (avoids `any` while remaining assignable to `{}`) */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export const roundStatusEnum = pgEnum('round_status', [
  'draft',
  'open',
  'finalized',
]);

export const participantTypeEnum = pgEnum('participant_type', [
  'individual',
  'team',
]);

export const recordedByRoleEnum = pgEnum('recorded_by_role', [
  'player',
  'marker',
  'commissioner',
]);

export const groupScopeEnum = pgEnum('group_scope', ['all', 'within_group']);

export const tournamentRoleEnum = pgEnum('tournament_role', [
  'commissioner',
  'marker',
  'player',
  'spectator',
]);

// ──────────────────────────────────────────────
// Profiles (extends Supabase auth.users)
// ──────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // references auth.users.id
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Persons (human identity — guest or registered)
// ──────────────────────────────────────────────

export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: text('display_name').notNull(),
  userId: uuid('user_id')
    .unique()
    .references(() => profiles.id, {
      onDelete: 'set null',
    }),
  createdByUserId: uuid('created_by_user_id').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  currentHandicap: numeric('current_handicap', {
    precision: 4,
    scale: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Courses (shared global library)
// ──────────────────────────────────────────────

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  numberOfHoles: integer('number_of_holes').notNull().default(18),
  createdByUserId: uuid('created_by_user_id').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const courseHoles = pgTable('course_holes', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  holeNumber: integer('hole_number').notNull(),
  par: integer('par').notNull(),
  strokeIndex: integer('stroke_index').notNull(),
  yardage: integer('yardage'),
});

// ──────────────────────────────────────────────
// Tournaments
// ──────────────────────────────────────────────

export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  isSingleRound: boolean('is_single_round').notNull().default(false),
  createdByUserId: uuid('created_by_user_id')
    .references(() => profiles.id, { onDelete: 'set null' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Tournament Participants
// ──────────────────────────────────────────────

export const tournamentParticipants = pgTable('tournament_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  personId: uuid('person_id')
    .references(() => persons.id, { onDelete: 'cascade' })
    .notNull(),
  role: tournamentRoleEnum('role').notNull().default('player'),
  handicapOverride: numeric('handicap_override', {
    precision: 4,
    scale: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Tournament Teams (persistent identity)
// ──────────────────────────────────────────────

export const tournamentTeams = pgTable('tournament_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Tournament Team Members
// ──────────────────────────────────────────────

export const tournamentTeamMembers = pgTable('tournament_team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => tournamentTeams.id, { onDelete: 'cascade' })
    .notNull(),
  participantId: uuid('participant_id')
    .references(() => tournamentParticipants.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Rounds
// ──────────────────────────────────────────────

export const rounds = pgTable('rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'restrict' })
    .notNull(),
  roundNumber: integer('round_number'),
  date: timestamp('date', { withTimezone: true }),
  teeTime: text('tee_time'), // HH:mm format
  format: text('format'), // display label e.g. "Irish Rumble", "Singles"
  status: roundStatusEnum('status').notNull().default('draft'),
  createdByUserId: uuid('created_by_user_id').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Round Groups (playing groups / fourballs)
// ──────────────────────────────────────────────

export const roundGroups = pgTable('round_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  groupNumber: integer('group_number').notNull(),
  name: text('name'), // optional label, e.g. "Group A"
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Round Participants (with handicap snapshot)
// ──────────────────────────────────────────────

export const roundParticipants = pgTable('round_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  roundGroupId: uuid('round_group_id').references(() => roundGroups.id, {
    onDelete: 'set null',
  }),
  personId: uuid('person_id')
    .references(() => persons.id, { onDelete: 'cascade' })
    .notNull(),
  tournamentParticipantId: uuid('tournament_participant_id').references(
    () => tournamentParticipants.id,
    { onDelete: 'cascade' },
  ),
  handicapSnapshot: numeric('handicap_snapshot', {
    precision: 4,
    scale: 1,
  }).notNull(),
  handicapOverride: numeric('handicap_override', {
    precision: 4,
    scale: 1,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Round Teams (per-round composition)
// ──────────────────────────────────────────────

export const roundTeams = pgTable('round_teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  tournamentTeamId: uuid('tournament_team_id').references(
    () => tournamentTeams.id,
    { onDelete: 'set null' },
  ),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roundTeamMembers = pgTable('round_team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundTeamId: uuid('round_team_id')
    .references(() => roundTeams.id, { onDelete: 'cascade' })
    .notNull(),
  roundParticipantId: uuid('round_participant_id')
    .references(() => roundParticipants.id, { onDelete: 'cascade' })
    .notNull(),
});

// ──────────────────────────────────────────────
// Score Events (immutable, append-only)
// ──────────────────────────────────────────────

export const scoreEvents = pgTable('score_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  roundParticipantId: uuid('round_participant_id')
    .references(() => roundParticipants.id, { onDelete: 'cascade' })
    .notNull(),
  holeNumber: integer('hole_number').notNull(),
  strokes: integer('strokes').notNull(),
  recordedByUserId: uuid('recorded_by_user_id')
    .references(() => profiles.id, { onDelete: 'set null' })
    .notNull(),
  recordedByRole: recordedByRoleEnum('recorded_by_role').notNull(),
  deviceId: text('device_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Competitions (configuration objects)
// ──────────────────────────────────────────────

export const competitions = pgTable('competitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  participantType: participantTypeEnum('participant_type')
    .notNull()
    .default('individual'),
  groupScope: groupScopeEnum('group_scope').notNull().default('all'),
  formatType: text('format_type').notNull(),
  configJson: jsonb('config_json').$type<Record<string, JsonValue>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Tournament Standings (aggregation of round competitions)
// ──────────────────────────────────────────────

export const tournamentStandings = pgTable('tournament_standings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  participantType: participantTypeEnum('participant_type').notNull(),
  /** Aggregation method + config */
  aggregationConfig: jsonb('aggregation_config')
    .$type<Record<string, JsonValue>>()
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Bonus Awards (NTP / LD winners)
// ──────────────────────────────────────────────

export const bonusAwards = pgTable('bonus_awards', {
  id: uuid('id').primaryKey().defaultRandom(),
  competitionId: uuid('competition_id')
    .references(() => competitions.id, { onDelete: 'cascade' })
    .notNull(),
  roundParticipantId: uuid('round_participant_id')
    .references(() => roundParticipants.id, { onDelete: 'cascade' })
    .notNull(),
  awardedByUserId: uuid('awarded_by_user_id').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  linkedPersons: many(persons, { relationName: 'personUser' }),
  createdPersons: many(persons, { relationName: 'personCreator' }),
}));

export const personsRelations = relations(persons, ({ one, many }) => ({
  user: one(profiles, {
    fields: [persons.userId],
    references: [profiles.id],
    relationName: 'personUser',
  }),
  createdBy: one(profiles, {
    fields: [persons.createdByUserId],
    references: [profiles.id],
    relationName: 'personCreator',
  }),
  tournamentParticipants: many(tournamentParticipants),
  roundParticipants: many(roundParticipants),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  createdBy: one(profiles, {
    fields: [courses.createdByUserId],
    references: [profiles.id],
  }),
  holes: many(courseHoles),
}));

export const courseHolesRelations = relations(courseHoles, ({ one }) => ({
  course: one(courses, {
    fields: [courseHoles.courseId],
    references: [courses.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  createdBy: one(profiles, {
    fields: [tournaments.createdByUserId],
    references: [profiles.id],
  }),
  participants: many(tournamentParticipants),
  teams: many(tournamentTeams),
  rounds: many(rounds),
  competitions: many(competitions),
  standings: many(tournamentStandings),
}));

export const tournamentParticipantsRelations = relations(
  tournamentParticipants,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [tournamentParticipants.tournamentId],
      references: [tournaments.id],
    }),
    person: one(persons, {
      fields: [tournamentParticipants.personId],
      references: [persons.id],
    }),
    roundParticipants: many(roundParticipants),
    teamMemberships: many(tournamentTeamMembers),
  }),
);

export const tournamentTeamsRelations = relations(
  tournamentTeams,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [tournamentTeams.tournamentId],
      references: [tournaments.id],
    }),
    members: many(tournamentTeamMembers),
    roundTeams: many(roundTeams),
  }),
);

export const tournamentTeamMembersRelations = relations(
  tournamentTeamMembers,
  ({ one }) => ({
    team: one(tournamentTeams, {
      fields: [tournamentTeamMembers.teamId],
      references: [tournamentTeams.id],
    }),
    participant: one(tournamentParticipants, {
      fields: [tournamentTeamMembers.participantId],
      references: [tournamentParticipants.id],
    }),
  }),
);

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [rounds.tournamentId],
    references: [tournaments.id],
  }),
  course: one(courses, {
    fields: [rounds.courseId],
    references: [courses.id],
  }),
  createdBy: one(profiles, {
    fields: [rounds.createdByUserId],
    references: [profiles.id],
  }),
  groups: many(roundGroups),
  participants: many(roundParticipants),
  teams: many(roundTeams),
  scoreEvents: many(scoreEvents),
  competitions: many(competitions),
}));

export const roundGroupsRelations = relations(roundGroups, ({ one, many }) => ({
  round: one(rounds, {
    fields: [roundGroups.roundId],
    references: [rounds.id],
  }),
  participants: many(roundParticipants),
}));

export const roundParticipantsRelations = relations(
  roundParticipants,
  ({ one, many }) => ({
    round: one(rounds, {
      fields: [roundParticipants.roundId],
      references: [rounds.id],
    }),
    group: one(roundGroups, {
      fields: [roundParticipants.roundGroupId],
      references: [roundGroups.id],
    }),
    person: one(persons, {
      fields: [roundParticipants.personId],
      references: [persons.id],
    }),
    tournamentParticipant: one(tournamentParticipants, {
      fields: [roundParticipants.tournamentParticipantId],
      references: [tournamentParticipants.id],
    }),
    scoreEvents: many(scoreEvents),
    teamMemberships: many(roundTeamMembers),
  }),
);

export const roundTeamsRelations = relations(roundTeams, ({ one, many }) => ({
  round: one(rounds, {
    fields: [roundTeams.roundId],
    references: [rounds.id],
  }),
  tournamentTeam: one(tournamentTeams, {
    fields: [roundTeams.tournamentTeamId],
    references: [tournamentTeams.id],
  }),
  members: many(roundTeamMembers),
}));

export const roundTeamMembersRelations = relations(
  roundTeamMembers,
  ({ one }) => ({
    roundTeam: one(roundTeams, {
      fields: [roundTeamMembers.roundTeamId],
      references: [roundTeams.id],
    }),
    roundParticipant: one(roundParticipants, {
      fields: [roundTeamMembers.roundParticipantId],
      references: [roundParticipants.id],
    }),
  }),
);

export const scoreEventsRelations = relations(scoreEvents, ({ one }) => ({
  round: one(rounds, {
    fields: [scoreEvents.roundId],
    references: [rounds.id],
  }),
  roundParticipant: one(roundParticipants, {
    fields: [scoreEvents.roundParticipantId],
    references: [roundParticipants.id],
  }),
  recordedBy: one(profiles, {
    fields: [scoreEvents.recordedByUserId],
    references: [profiles.id],
  }),
}));

export const competitionsRelations = relations(
  competitions,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [competitions.tournamentId],
      references: [tournaments.id],
    }),
    round: one(rounds, {
      fields: [competitions.roundId],
      references: [rounds.id],
    }),
    bonusAwards: many(bonusAwards),
  }),
);

export const bonusAwardsRelations = relations(bonusAwards, ({ one }) => ({
  competition: one(competitions, {
    fields: [bonusAwards.competitionId],
    references: [competitions.id],
  }),
  roundParticipant: one(roundParticipants, {
    fields: [bonusAwards.roundParticipantId],
    references: [roundParticipants.id],
  }),
  awardedBy: one(profiles, {
    fields: [bonusAwards.awardedByUserId],
    references: [profiles.id],
  }),
}));

export const tournamentStandingsRelations = relations(
  tournamentStandings,
  ({ one }) => ({
    tournament: one(tournaments, {
      fields: [tournamentStandings.tournamentId],
      references: [tournaments.id],
    }),
  }),
);
