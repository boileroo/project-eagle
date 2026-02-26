import { useMutation } from '@tanstack/react-query';
import {
  createRoundFn,
  updateRoundFn,
  deleteRoundFn,
  transitionRoundFn,
  reorderRoundsFn,
  createSingleRoundFn,
  removeRoundParticipantFn,
  updateRoundParticipantFn,
} from '@/lib/rounds.server';
import type { CreateSingleRoundInput } from '@/lib/validators';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useCreateRound
// ──────────────────────────────────────────────

type CreateRoundVariables = {
  tournamentId: string;
  courseId: string;
  date?: string;
  teeTime?: string;
  format?: string;
};
type CreateRoundResult = { roundId: string };

export function useCreateRound(): MutationHookReturn<
  CreateRoundVariables,
  CreateRoundResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateRoundVariables) =>
      createRoundFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateRoundVariables, CreateRoundResult>) => {
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
// useUpdateRound
// ──────────────────────────────────────────────

type UpdateRoundVariables = {
  id: string;
  courseId?: string;
  date?: string;
  teeTime?: string;
  format?: string;
};
type UpdateRoundResult = { roundId: string };

export function useUpdateRound(): MutationHookReturn<
  UpdateRoundVariables,
  UpdateRoundResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateRoundVariables) =>
      updateRoundFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdateRoundVariables, UpdateRoundResult>) => {
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
// useDeleteRound
// ──────────────────────────────────────────────

type DeleteRoundVariables = { roundId: string };
type DeleteRoundResult = { success: boolean };

export function useDeleteRound(): MutationHookReturn<
  DeleteRoundVariables,
  DeleteRoundResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteRoundVariables) =>
      deleteRoundFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteRoundVariables, DeleteRoundResult>) => {
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
// useTransitionRound
// ──────────────────────────────────────────────

type TransitionRoundVariables = {
  roundId: string;
  newStatus: 'draft' | 'scheduled' | 'open' | 'finalized';
};
type TransitionRoundResult = { success: boolean };

export function useTransitionRound(): MutationHookReturn<
  TransitionRoundVariables,
  TransitionRoundResult
> {
  const mutation = useMutation({
    mutationFn: (variables: TransitionRoundVariables) =>
      transitionRoundFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<TransitionRoundVariables, TransitionRoundResult>) => {
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
// useReorderRounds
// ──────────────────────────────────────────────

type ReorderRoundsVariables = {
  tournamentId: string;
  roundIds: string[];
};
type ReorderRoundsResult = { success: boolean };

export function useReorderRounds(): MutationHookReturn<
  ReorderRoundsVariables,
  ReorderRoundsResult
> {
  const mutation = useMutation({
    mutationFn: (variables: ReorderRoundsVariables) =>
      reorderRoundsFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<ReorderRoundsVariables, ReorderRoundsResult>) => {
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
// useCreateSingleRound
// ──────────────────────────────────────────────

type CreateSingleRoundVariables = CreateSingleRoundInput;
type CreateSingleRoundResult = { tournamentId: string; roundId: string };

export function useCreateSingleRound(): MutationHookReturn<
  CreateSingleRoundVariables,
  CreateSingleRoundResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateSingleRoundVariables) =>
      createSingleRoundFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    CreateSingleRoundVariables,
    CreateSingleRoundResult
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
// useRemoveRoundParticipant
// ──────────────────────────────────────────────

type RemoveRoundParticipantVariables = { roundParticipantId: string };
type RemoveRoundParticipantResult = { success: boolean };

export function useRemoveRoundParticipant(): MutationHookReturn<
  RemoveRoundParticipantVariables,
  RemoveRoundParticipantResult
> {
  const mutation = useMutation({
    mutationFn: (variables: RemoveRoundParticipantVariables) =>
      removeRoundParticipantFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    RemoveRoundParticipantVariables,
    RemoveRoundParticipantResult
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
// useUpdateRoundParticipant
// ──────────────────────────────────────────────

type UpdateRoundParticipantVariables = {
  roundParticipantId: string;
  handicapOverride: number | null;
};
type UpdateRoundParticipantResult = { success: boolean };

export function useUpdateRoundParticipant(): MutationHookReturn<
  UpdateRoundParticipantVariables,
  UpdateRoundParticipantResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateRoundParticipantVariables) =>
      updateRoundParticipantFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    UpdateRoundParticipantVariables,
    UpdateRoundParticipantResult
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
