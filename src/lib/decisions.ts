import { useMutation } from '@tanstack/react-query';
import { submitDecisionFn } from '@/lib/decisions.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

type SubmitDecisionVariables = {
  gameId: string;
  roundId: string;
  groupId: string;
  holeNumber: number;
  wolfPlayerId: string;
  partnerPlayerId: string | null;
  isBlindLoneWolf?: boolean;
};
type SubmitDecisionResult = {
  id: string;
  gameId: string;
  roundId: string;
  groupId: string | null;
  holeNumber: number;
  data: Record<string, unknown>;
  recordedByUserId: string;
  createdAt: Date;
};

export function useSubmitDecision(): MutationHookReturn<
  SubmitDecisionVariables,
  SubmitDecisionResult
> {
  const mutation = useMutation({
    mutationFn: (variables: SubmitDecisionVariables) =>
      submitDecisionFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<SubmitDecisionVariables, SubmitDecisionResult>) => {
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
