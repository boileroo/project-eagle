import { z } from 'zod';
import { gameConfigSchema } from '../game-config';

export const createGameSchema = z.object({
  tournamentId: z.string().uuid(),
  roundId: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().min(1, 'Game name is required').max(150),
  gameConfig: gameConfigSchema,
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const updateGameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Game name is required').max(150).optional(),
  gameConfig: gameConfigSchema.optional(),
});
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export const awardSideGameSchema = z.object({
  sideGameId: z.string().uuid(),
  roundPlayerId: z.string().uuid(),
});
export type AwardSideGameInput = z.infer<typeof awardSideGameSchema>;

export const createSideGameSchema = z.object({
  tournamentId: z.string().uuid(),
  roundId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(150),
  format: z.enum(['nearest_pin', 'longest_drive']),
  holeNumber: z.number().int().min(1).max(18).optional(),
  bonusMode: z.string().optional(),
  bonusPoints: z.number().int().min(0).optional(),
});
export type CreateSideGameInput = z.infer<typeof createSideGameSchema>;
