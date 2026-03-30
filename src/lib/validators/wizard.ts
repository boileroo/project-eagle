import { z } from 'zod';
import { competitionConfigSchema } from '../competition-config';
import { handicapField, dateField, teeTimeField } from './shared';

export const wizardPlayerSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100),
  currentHandicap: handicapField,
});
export type WizardPlayer = z.infer<typeof wizardPlayerSchema>;

export const wizardCompetitionSchema = z.object({
  name: z.string().min(1, 'Competition name is required').max(150),
  competitionCategory: z.enum(['match', 'game', 'bonus']),
  competitionConfig: competitionConfigSchema,
});
export type WizardCompetition = z.infer<typeof wizardCompetitionSchema>;

export const wizardRoundSchema = z.object({
  courseId: z.string().uuid('Please select a course'),
  date: dateField.optional(),
  teeTime: teeTimeField.optional(),
  competitions: z.array(wizardCompetitionSchema),
});
export type WizardRound = z.infer<typeof wizardRoundSchema>;

export const wizardTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  playerIndices: z.array(z.number().int().min(0)),
});
export type WizardTeam = z.infer<typeof wizardTeamSchema>;

export const createEventSchema = z.object({
  isSingleRound: z.boolean(),
  tournamentName: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(1000).optional(),
  players: z
    .array(wizardPlayerSchema)
    .min(1, 'At least one player is required'),
  teams: z.array(wizardTeamSchema),
  rounds: z.array(wizardRoundSchema).min(1, 'At least one round is required'),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;
