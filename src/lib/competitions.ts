export * from './competition-config';

import { useMutation } from '@tanstack/react-query';
import type { CompetitionConfig } from './competition-config';
import {
  createCompetitionFn,
  updateCompetitionFn,
  deleteCompetitionFn,
  awardBonusFn,
  removeBonusAwardFn,
} from '@/lib/competitions.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

type CreateCompetitionVariables = {
  tournamentId: string;
  roundId: string;
  name: string;
  competitionCategory: 'match' | 'game' | 'bonus';
  groupScope?: 'all' | 'within_group';
  competitionConfig: CompetitionConfig;
};
type CreateCompetitionResult = Awaited<ReturnType<typeof createCompetitionFn>>;

export function useCreateCompetition(): MutationHookReturn<
  CreateCompetitionVariables,
  CreateCompetitionResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateCompetitionVariables) =>
      createCompetitionFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    CreateCompetitionVariables,
    CreateCompetitionResult
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

type UpdateCompetitionVariables = {
  id: string;
  name?: string;
  groupScope?: 'all' | 'within_group';
  competitionConfig?: CompetitionConfig;
};
type UpdateCompetitionResult = Awaited<ReturnType<typeof updateCompetitionFn>>;

export function useUpdateCompetition(): MutationHookReturn<
  UpdateCompetitionVariables,
  UpdateCompetitionResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateCompetitionVariables) =>
      updateCompetitionFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    UpdateCompetitionVariables,
    UpdateCompetitionResult
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

// ──────────────────────────────────────────────
// useDeleteCompetition
// ──────────────────────────────────────────────

type DeleteCompetitionVariables = {
  competitionId: string;
};
type DeleteCompetitionResult = { success: boolean };

export function useDeleteCompetition(): MutationHookReturn<
  DeleteCompetitionVariables,
  DeleteCompetitionResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteCompetitionVariables) =>
      deleteCompetitionFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    DeleteCompetitionVariables,
    DeleteCompetitionResult
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

// ──────────────────────────────────────────────
// useAwardBonus
// ──────────────────────────────────────────────

type AwardBonusVariables = {
  competitionId: string;
  roundParticipantId: string;
};
type AwardBonusResult = Awaited<ReturnType<typeof awardBonusFn>>;

export function useAwardBonus(): MutationHookReturn<
  AwardBonusVariables,
  AwardBonusResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AwardBonusVariables) =>
      awardBonusFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<AwardBonusVariables, AwardBonusResult>) => {
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

// ──────────────────────────────────────────────
// useRemoveBonusAward
// ──────────────────────────────────────────────

type RemoveBonusAwardVariables = {
  competitionId: string;
};
type RemoveBonusAwardResult = { success: boolean };

export function useRemoveBonusAward(): MutationHookReturn<
  RemoveBonusAwardVariables,
  RemoveBonusAwardResult
> {
  const mutation = useMutation({
    mutationFn: (variables: RemoveBonusAwardVariables) =>
      removeBonusAwardFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    RemoveBonusAwardVariables,
    RemoveBonusAwardResult
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
