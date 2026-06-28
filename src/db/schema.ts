import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
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
  'scheduled',
  'open',
  'finalized',
]);

export const tournamentStatusEnum = pgEnum('tournament_status', [
  'setup',
  'scheduled',
  'underway',
  'complete',
]);

export const tournamentModeEnum = pgEnum('tournament_mode', [
  'individual',
  'team',
]);

export const primaryScoringBasisEnum = pgEnum('primary_scoring_basis', [
  'gross_strokes',
  'net_strokes',
  'stableford',
  'total',
]);

export const recordedByRoleEnum = pgEnum('recorded_by_role', [
  'player',
  'marker',
  'commissioner',
]);

export const tournamentRoleEnum = pgEnum('tournament_role', [
  'commissioner',
  'player',
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
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
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

export const courseHoles = pgTable(
  'course_holes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    holeNumber: integer('hole_number').notNull(),
    par: integer('par').notNull(),
    strokeIndex: integer('stroke_index').notNull(),
    yardage: integer('yardage'),
  },
  (table) => ({
    courseHoleUnique: uniqueIndex('course_holes_course_hole_unique').on(
      table.courseId,
      table.holeNumber,
    ),
  }),
);

// ──────────────────────────────────────────────
// Tournaments
// ──────────────────────────────────────────────

export const tournaments = pgTable(
  'tournaments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    status: tournamentStatusEnum('status').notNull().default('setup'),
    mode: tournamentModeEnum('mode').notNull().default('individual'),
    isSingleRound: boolean('is_single_round').notNull().default(false),
    inviteCode: text('invite_code').notNull(),
    scoringBasis: primaryScoringBasisEnum('scoring_basis'),
    trackIndividualScoreboard: boolean('track_individual_scoreboard')
      .notNull()
      .default(true),
    createdByUserId: uuid('created_by_user_id')
      .references(() => profiles.id, { onDelete: 'set null' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    inviteCodeUnique: uniqueIndex('tournaments_invite_code_unique').on(
      table.inviteCode,
    ),
  }),
);

// ──────────────────────────────────────────────
// Players (tournament roster)
// ──────────────────────────────────────────────

export const players = pgTable(
  'players',
  {
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
  },
  (table) => ({
    tournamentPersonUnique: uniqueIndex('players_tournament_person_unique').on(
      table.tournamentId,
      table.personId,
    ),
  }),
);

// ──────────────────────────────────────────────
// Teams (persistent tournament teams)
// ──────────────────────────────────────────────

export const teams = pgTable('teams', {
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
// Team Members
// ──────────────────────────────────────────────

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .references(() => teams.id, { onDelete: 'cascade' })
      .notNull(),
    playerId: uuid('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    teamPlayerUnique: uniqueIndex('team_members_team_player_unique').on(
      table.teamId,
      table.playerId,
    ),
  }),
);

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
  label: text('label'), // optional display label e.g. "Day 1 - Irish Rumble"
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
// Groups (playing groups / fourballs within a round)
// ──────────────────────────────────────────────

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .references(() => rounds.id, { onDelete: 'cascade' })
      .notNull(),
    groupNumber: integer('group_number').notNull(),
    name: text('name'), // optional label, e.g. "Group A"
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    roundGroupNumberUnique: uniqueIndex('groups_round_group_unique').on(
      table.roundId,
      table.groupNumber,
    ),
  }),
);

// ──────────────────────────────────────────────
// Round Players (with handicap snapshot)
// ──────────────────────────────────────────────

export const roundPlayers = pgTable(
  'round_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roundId: uuid('round_id')
      .references(() => rounds.id, { onDelete: 'cascade' })
      .notNull(),
    groupId: uuid('group_id').references(() => groups.id, {
      onDelete: 'set null',
    }),
    personId: uuid('person_id')
      .references(() => persons.id, { onDelete: 'cascade' })
      .notNull(),
    playerId: uuid('player_id').references(() => players.id, {
      onDelete: 'cascade',
    }),
    handicapSnapshot: numeric('handicap_snapshot', {
      precision: 4,
      scale: 1,
    }).notNull(),
    handicapOverride: numeric('handicap_override', {
      precision: 4,
      scale: 1,
    }),
    isMarker: boolean('is_marker').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    roundPersonUnique: uniqueIndex('round_players_round_person_unique').on(
      table.roundId,
      table.personId,
    ),
  }),
);

// ──────────────────────────────────────────────
// Scores (immutable, append-only)
// ──────────────────────────────────────────────

export const scores = pgTable('scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  roundPlayerId: uuid('round_player_id')
    .references(() => roundPlayers.id, { onDelete: 'cascade' })
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
// Games (format configuration for a group in a round)
// ──────────────────────────────────────────────

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  format: text('format').notNull(),
  config: jsonb('config').$type<Record<string, JsonValue>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ──────────────────────────────────────────────
// Side Games (NTP / LD — one winner per round across all groups)
// ──────────────────────────────────────────────

export const sideGames = pgTable('side_games', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  format: text('format').notNull(), // e.g. "nearest_pin", "longest_drive"
  holeNumber: integer('hole_number'),
  bonusMode: text('bonus_mode'), // e.g. "points"
  bonusPoints: integer('bonus_points'),
  winnerId: uuid('winner_id').references(() => roundPlayers.id, {
    onDelete: 'set null',
  }),
  awardedByUserId: uuid('awarded_by_user_id').references(() => profiles.id, {
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
// Decisions (immutable, append-only)
// Per-hole game declarations (e.g. Wolf partner choice).
// Latest record per (gameId, holeNumber) wins.
// ──────────────────────────────────────────────

export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .references(() => games.id, { onDelete: 'cascade' })
    .notNull(),
  roundId: uuid('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  groupId: uuid('group_id').references(() => groups.id, {
    onDelete: 'cascade',
  }),
  holeNumber: integer('hole_number').notNull(),
  /** Format-specific data. Wolf: { wolfPlayerId, partnerPlayerId | null } */
  data: jsonb('data').$type<Record<string, JsonValue>>().notNull(),
  recordedByUserId: uuid('recorded_by_user_id')
    .references(() => profiles.id, { onDelete: 'set null' })
    .notNull(),
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
  players: many(players),
  roundPlayers: many(roundPlayers),
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
  players: many(players),
  teams: many(teams),
  rounds: many(rounds),
  games: many(games),
  sideGames: many(sideGames),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [players.tournamentId],
    references: [tournaments.id],
  }),
  person: one(persons, {
    fields: [players.personId],
    references: [persons.id],
  }),
  roundPlayers: many(roundPlayers),
  teamMemberships: many(teamMembers),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [teams.tournamentId],
    references: [tournaments.id],
  }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  player: one(players, {
    fields: [teamMembers.playerId],
    references: [players.id],
  }),
}));

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
  groups: many(groups),
  players: many(roundPlayers),
  scores: many(scores),
  games: many(games),
  sideGames: many(sideGames),
  decisions: many(decisions),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  round: one(rounds, {
    fields: [groups.roundId],
    references: [rounds.id],
  }),
  players: many(roundPlayers),
}));

export const roundPlayersRelations = relations(
  roundPlayers,
  ({ one, many }) => ({
    round: one(rounds, {
      fields: [roundPlayers.roundId],
      references: [rounds.id],
    }),
    group: one(groups, {
      fields: [roundPlayers.groupId],
      references: [groups.id],
    }),
    person: one(persons, {
      fields: [roundPlayers.personId],
      references: [persons.id],
    }),
    player: one(players, {
      fields: [roundPlayers.playerId],
      references: [players.id],
    }),
    scores: many(scores),
  }),
);

export const scoresRelations = relations(scores, ({ one }) => ({
  round: one(rounds, {
    fields: [scores.roundId],
    references: [rounds.id],
  }),
  roundPlayer: one(roundPlayers, {
    fields: [scores.roundPlayerId],
    references: [roundPlayers.id],
  }),
  recordedBy: one(profiles, {
    fields: [scores.recordedByUserId],
    references: [profiles.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [games.tournamentId],
    references: [tournaments.id],
  }),
  round: one(rounds, {
    fields: [games.roundId],
    references: [rounds.id],
  }),
  group: one(groups, {
    fields: [games.groupId],
    references: [groups.id],
  }),
  decisions: many(decisions),
}));

export const sideGamesRelations = relations(sideGames, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [sideGames.tournamentId],
    references: [tournaments.id],
  }),
  round: one(rounds, {
    fields: [sideGames.roundId],
    references: [rounds.id],
  }),
  winner: one(roundPlayers, {
    fields: [sideGames.winnerId],
    references: [roundPlayers.id],
  }),
  awardedBy: one(profiles, {
    fields: [sideGames.awardedByUserId],
    references: [profiles.id],
  }),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  game: one(games, {
    fields: [decisions.gameId],
    references: [games.id],
  }),
  round: one(rounds, {
    fields: [decisions.roundId],
    references: [rounds.id],
  }),
  group: one(groups, {
    fields: [decisions.groupId],
    references: [groups.id],
  }),
  recordedBy: one(profiles, {
    fields: [decisions.recordedByUserId],
    references: [profiles.id],
  }),
}));
