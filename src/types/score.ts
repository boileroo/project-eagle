import type { SubmitScoreInput } from '@/lib/validators';

export type SubmitScoreVariables = SubmitScoreInput & {
  roundParticipantId: string;
  holeNumber: number;
  strokes: number;
};
