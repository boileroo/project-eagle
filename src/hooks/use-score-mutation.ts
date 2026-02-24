import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ScorecardData } from '@/types';
import type { SubmitScoreInput } from '@/lib/validators';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type SubmitScoreVariables = SubmitScoreInput & {
  clientMeta?: { savedOffline?: boolean };
};

type MutationContext = {
  previousScorecard: ScorecardData | undefined;
  savedOffline: boolean;
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

/**
 * Reusable score mutation hook.
 *
 * Uses the `['submit-score']` mutation key whose `mutationFn`, `onSuccess`,
 * `onSettled`, and `retry` are registered globally in `query-client.ts`.
 * This hook adds the optimistic update (`onMutate`) and rollback (`onError`).
 */
export function useScoreMutation(roundId: string) {
  const queryClient = useQueryClient();
  const scorecardQueryKey = ['round', roundId, 'scorecard'] as const;

  return useMutation<unknown, Error, SubmitScoreVariables, MutationContext>({
    mutationKey: ['submit-score'],

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: scorecardQueryKey });

      const previousScorecard =
        queryClient.getQueryData<ScorecardData>(scorecardQueryKey);

      const nextScorecard: ScorecardData = previousScorecard
        ? structuredClone(previousScorecard)
        : {};

      const participantScores = {
        ...nextScorecard[variables.roundParticipantId],
      };
      const existing = participantScores[variables.holeNumber];
      participantScores[variables.holeNumber] = {
        strokes: variables.strokes,
        recordedByRole: variables.recordedByRole,
        eventCount: (existing?.eventCount ?? 0) + 1,
      };
      nextScorecard[variables.roundParticipantId] = participantScores;
      queryClient.setQueryData(scorecardQueryKey, nextScorecard);

      const savedOffline = variables.clientMeta?.savedOffline ?? false;
      if (savedOffline) {
        toast.info(
          `Hole ${variables.holeNumber}: ${variables.strokes} stroke${variables.strokes !== 1 ? 's' : ''} saved offline.`,
        );
      }

      return {
        previousScorecard: savedOffline ? undefined : previousScorecard,
        savedOffline,
      };
    },

    onError: (error, variables, context) => {
      if (context?.previousScorecard) {
        queryClient.setQueryData(scorecardQueryKey, context.previousScorecard);
      } else {
        void queryClient.invalidateQueries({ queryKey: scorecardQueryKey });
      }

      const rawMessage = error instanceof Error ? error.message : '';
      const normalizedMessage = rawMessage.toLowerCase();
      const message = rawMessage
        ? normalizedMessage.includes('round must be open')
          ? 'Round is closed.'
          : normalizedMessage.includes('round not found')
            ? 'Round no longer exists.'
            : normalizedMessage.includes('participant not in this round')
              ? 'Player is no longer in this round.'
              : normalizedMessage.includes('failed to fetch')
                ? 'Network error. Check your connection.'
                : rawMessage
        : 'Failed to save score.';

      const wasSavedOffline = variables?.clientMeta?.savedOffline ?? false;
      const prefix = wasSavedOffline
        ? 'Offline score could not be synced.'
        : 'Score could not be saved.';

      toast.error(`Hole ${variables.holeNumber}: ${prefix} ${message}`);
    },
  });
}
