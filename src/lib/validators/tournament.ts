import { z } from 'zod';

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
