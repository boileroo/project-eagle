// Shared Zod validation schemas
//
// For database-derived schemas, see src/db/schema.ts (auto-generated via drizzle-zod).
// This file is for app-level validation schemas (forms, API inputs, etc.)

import { z } from 'zod';
import {
  competitionConfigSchema,
  aggregationConfigSchema,
} from './competitions';

// ──────────────────────────────────────────────
// Auth schemas
// ──────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = loginSchema
  .extend({
    confirmPassword: z.string().max(128),
    displayName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

// ──────────────────────────────────────────────
// Course schemas
// ──────────────────────────────────────────────

export const courseHoleSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(6),
  strokeIndex: z.number().int().min(1).max(18),
  yardage: z.number().int().min(50).max(700).nullable().optional(),
});
export type CourseHoleInput = z.infer<typeof courseHoleSchema>;

const courseBaseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(150),
  location: z.string().max(200).optional(),
  numberOfHoles: z.union([z.literal(9), z.literal(18)]),
  holes: z.array(courseHoleSchema),
});

const uniqueStrokeIndex = (data: { holes: { strokeIndex: number }[] }) => {
  const siValues = data.holes.map((h) => h.strokeIndex);
  return new Set(siValues).size === siValues.length;
};
const uniqueSiMessage = {
  message: 'Each stroke index must be unique',
  path: ['holes'] as PropertyKey[],
};

export const createCourseSchema = courseBaseSchema.refine(
  uniqueStrokeIndex,
  uniqueSiMessage,
);
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = courseBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(uniqueStrokeIndex, uniqueSiMessage);
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// ──────────────────────────────────────────────
// Account / profile schemas
// ──────────────────────────────────────────────

export const updateAccountSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  currentHandicap: z
    .number()
    .min(-10, 'Handicap cannot be below -10')
    .max(54, 'Handicap cannot exceed 54')
    .multipleOf(0.1, 'Handicap must be to one decimal place')
    .nullable()
    .optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ──────────────────────────────────────────────
// Tournament schemas
// ──────────────────────────────────────────────

export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(150),
  description: z.string().max(1000).optional(),
});
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const updateTournamentSchema = createTournamentSchema.extend({
  id: z.string().uuid(),
});
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const joinByCodeSchema = z.object({
  code: z.string().min(1, 'Invite code is required').max(20),
});
export type JoinByCodeInput = z.infer<typeof joinByCodeSchema>;

export const createSingleRoundSchema = z.object({
  courseId: z.string().uuid('Please select a course'),
  date: z.string().optional(),
  teeTime: z.string().optional(),
});
export type CreateSingleRoundInput = z.infer<typeof createSingleRoundSchema>;

// ──────────────────────────────────────────────
// Tournament participant schemas
// ──────────────────────────────────────────────

export const addParticipantSchema = z.object({
  tournamentId: z.string().uuid(),
  personId: z.string().uuid(),
  role: z.enum(['commissioner', 'marker', 'player']).default('player'),
  handicapOverride: z
    .number()
    .min(-10)
    .max(54)
    .multipleOf(0.1)
    .nullable()
    .optional(),
});
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const updateParticipantSchema = z.object({
  participantId: z.string().uuid(),
  role: z.enum(['marker', 'player']).optional(),
  handicapOverride: z
    .number()
    .min(-10)
    .max(54)
    .multipleOf(0.1)
    .nullable()
    .optional(),
});
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;

export const createGuestSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  currentHandicap: z
    .number()
    .min(-10)
    .max(54)
    .multipleOf(0.1)
    .nullable()
    .optional(),
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = z.object({
  personId: z.string().uuid(),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  currentHandicap: z
    .number()
    .min(-10)
    .max(54)
    .multipleOf(0.1)
    .nullable()
    .optional(),
});
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export const deleteGuestSchema = z.object({
  personId: z.string().uuid(),
});
export type DeleteGuestInput = z.infer<typeof deleteGuestSchema>;

// ──────────────────────────────────────────────
// Tournament team schemas
// ──────────────────────────────────────────────

export const createTeamSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().min(1, 'Team name is required').max(100),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1, 'Team name is required').max(100),
});
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const addTeamMemberSchema = z.object({
  teamId: z.string().uuid(),
  participantId: z.string().uuid(),
});
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

// ──────────────────────────────────────────────
// Round schemas
// ──────────────────────────────────────────────

export const createRoundSchema = z.object({
  tournamentId: z.string().uuid(),
  courseId: z.string().uuid('Please select a course'),
  date: z.string().max(10).optional(), // ISO date string from input[type=date]
  teeTime: z.string().max(5).optional(), // HH:mm string from input[type=time]
  format: z.string().max(100).optional(), // display label e.g. "Irish Rumble", "Singles"
});
export type CreateRoundInput = z.infer<typeof createRoundSchema>;

export const updateRoundSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid('Please select a course').optional(),
  date: z.string().max(10).optional(),
  teeTime: z.string().max(5).optional(), // HH:mm string from input[type=time]
  format: z.string().max(100).optional(), // display label e.g. "Irish Rumble", "Singles"
});
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;

// ──────────────────────────────────────────────
// Round group schemas
// ──────────────────────────────────────────────

export const createRoundGroupSchema = z.object({
  roundId: z.string().uuid(),
  groupNumber: z.number().int().min(1),
  name: z.string().max(100).optional(),
});
export type CreateRoundGroupInput = z.infer<typeof createRoundGroupSchema>;

export const assignParticipantToGroupSchema = z.object({
  roundParticipantId: z.string().uuid(),
  roundGroupId: z.string().uuid().nullable(),
});
export type AssignParticipantToGroupInput = z.infer<
  typeof assignParticipantToGroupSchema
>;

export const autoAssignGroupsSchema = z.object({
  roundId: z.string().uuid(),
  groupSize: z.number().int().min(1).max(4).default(4),
});
export type AutoAssignGroupsInput = z.infer<typeof autoAssignGroupsSchema>;

// ──────────────────────────────────────────────
// Score entry schemas
// ──────────────────────────────────────────────

export const submitScoreSchema = z.object({
  roundId: z.string().uuid(),
  roundParticipantId: z.string().uuid(),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(20),
  recordedByRole: z.enum(['player', 'marker', 'commissioner']),
});
export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;

// ──────────────────────────────────────────────
// Competition schemas
// ──────────────────────────────────────────────

export const createCompetitionSchema = z.object({
  tournamentId: z.string().uuid(),
  roundId: z.string().uuid(),
  name: z.string().min(1, 'Competition name is required').max(150),
  competitionCategory: z.enum(['match', 'game', 'bonus']),
  groupScope: z.enum(['all', 'within_group']).default('all'),
  /** The full config including formatType discriminant */
  competitionConfig: competitionConfigSchema,
});
export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;

export const updateCompetitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Competition name is required').max(150).optional(),
  groupScope: z.enum(['all', 'within_group']).optional(),
  competitionConfig: competitionConfigSchema.optional(),
});
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;

// ──────────────────────────────────────────────
// Bonus award schemas
// ──────────────────────────────────────────────

export const awardBonusSchema = z.object({
  competitionId: z.string().uuid(),
  roundParticipantId: z.string().uuid(),
});
export type AwardBonusInput = z.infer<typeof awardBonusSchema>;

// ──────────────────────────────────────────────
// Tournament standings schemas
// ──────────────────────────────────────────────

export const createTournamentStandingSchema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().min(1, 'Standing name is required').max(150),
  participantType: z.enum(['individual', 'team']),
  aggregationConfig: aggregationConfigSchema,
});
export type CreateTournamentStandingInput = z.infer<
  typeof createTournamentStandingSchema
>;

export const updateTournamentStandingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Standing name is required').max(150).optional(),
  aggregationConfig: aggregationConfigSchema.optional(),
});
export type UpdateTournamentStandingInput = z.infer<
  typeof updateTournamentStandingSchema
>;
