import { useMutation } from '@tanstack/react-query';
import { submitGameDecisionFn } from '@/lib/game-decisions.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useSubmitGameDecision
// ──────────────────────────────────────────────

type SubmitGameDecisionVariables = {
  competitionId: string;
  roundId: string;
  holeNumber: number;
  wolfPlayerId: string;
  partnerPlayerId: string | null;
};
type SubmitGameDecisionResult = {
  id: string;
  competitionId: string;
  roundId: string;
  holeNumber: number;
  data: Record<string, unknown>;
  recordedByUserId: string;
  createdAt: Date;
};

export function useSubmitGameDecision(): MutationHookReturn<
  SubmitGameDecisionVariables,
  SubmitGameDecisionResult
> {
  const mutation = useMutation({
    mutationFn: (variables: SubmitGameDecisionVariables) =>
      submitGameDecisionFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    SubmitGameDecisionVariables,
    SubmitGameDecisionResult
  >) => {
    try {
      const result = await mutation.mutateAsync(variables);
      await onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return [
    mutate,
    {
      isPending: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    },
  ] as const;
}
