import { z } from 'zod';
import {
  competitionConfigSchema,
  aggregationConfigSchema,
} from '../competitions';

export const createCompetitionSchema = z.object({
  tournamentId: z.string().uuid(),
  roundId: z.string().uuid(),
  name: z.string().min(1, 'Competition name is required').max(150),
  competitionCategory: z.enum(['match', 'game', 'bonus']),
  groupScope: z.enum(['all', 'within_group']).default('all'),
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

export const awardBonusSchema = z.object({
  competitionId: z.string().uuid(),
  roundParticipantId: z.string().uuid(),
});
export type AwardBonusInput = z.infer<typeof awardBonusSchema>;

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
