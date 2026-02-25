import { z } from 'zod';

export const submitScoreSchema = z.object({
  roundId: z.string().uuid(),
  roundParticipantId: z.string().uuid(),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(20),
  recordedByRole: z.enum(['player', 'marker', 'commissioner']),
});
export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;
