import { useMutation } from '@tanstack/react-query';
import { bulkSubmitScoresFn } from '@/lib/scores.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useBulkSubmitScores
// ──────────────────────────────────────────────

type BulkSubmitScoresVariables = {
  roundId: string;
  roundParticipantId: string;
  scores: Array<{ holeNumber: number; strokes: number }>;
};

/**
 * Mutation hook for bulk-submitting scores for a single participant.
 * Intended for dev/commissioner tooling only.
 */
export function useBulkSubmitScores(): MutationHookReturn<BulkSubmitScoresVariables> {
  const mutation = useMutation({
    mutationFn: (variables: BulkSubmitScoresVariables) =>
      bulkSubmitScoresFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<BulkSubmitScoresVariables>) => {
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
