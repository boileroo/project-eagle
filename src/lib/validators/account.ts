import { z } from 'zod';
import { handicapField } from './shared';

export const updateAccountSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  currentHandicap: handicapField,
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
