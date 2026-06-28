import { z } from 'zod';
import { handicapField } from './shared';

export const addPlayerSchema = z.object({
  tournamentId: z.string().uuid(),
  personId: z.string().uuid(),
  role: z.enum(['commissioner', 'player']).default('player'),
  handicapOverride: handicapField,
});
export type AddPlayerInput = z.infer<typeof addPlayerSchema>;

export const updatePlayerSchema = z.object({
  playerId: z.string().uuid(),
  role: z.enum(['commissioner', 'player']).optional(),
  handicapOverride: handicapField,
});
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;

export const createGuestSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  currentHandicap: handicapField,
});
export type CreateGuestInput = z.infer<typeof createGuestSchema>;

export const updateGuestSchema = z.object({
  personId: z.string().uuid(),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  currentHandicap: handicapField,
});
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export const deleteGuestSchema = z.object({
  personId: z.string().uuid(),
});
export type DeleteGuestInput = z.infer<typeof deleteGuestSchema>;
