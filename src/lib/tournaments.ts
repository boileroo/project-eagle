import { useMutation } from '@tanstack/react-query';
import {
  createTournamentFn,
  updateTournamentFn,
  deleteTournamentFn,
  createGuestPersonFn,
  updateGuestFn,
  deleteGuestFn,
  addParticipantFn,
  updateParticipantFn,
  removeParticipantFn,
  ensureMyPersonFn,
  lockTournamentFn,
  unlockTournamentFn,
  joinTournamentByCodeFn,
} from '@/lib/tournaments.server';
import type {
  CreateTournamentInput,
  UpdateTournamentInput,
  AddParticipantInput,
  UpdateParticipantInput,
  CreateGuestInput,
  UpdateGuestInput,
  DeleteGuestInput,
  JoinByCodeInput,
} from '@/lib/validators';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useCreateTournament
// ──────────────────────────────────────────────

type CreateTournamentVariables = CreateTournamentInput;
type CreateTournamentResult = { tournamentId: string };

export function useCreateTournament(): MutationHookReturn<
  CreateTournamentVariables,
  CreateTournamentResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateTournamentVariables) =>
      createTournamentFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    CreateTournamentVariables,
    CreateTournamentResult
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
// useUpdateTournament
// ──────────────────────────────────────────────

type UpdateTournamentVariables = UpdateTournamentInput;
type UpdateTournamentResult = { tournamentId: string };

export function useUpdateTournament(): MutationHookReturn<
  UpdateTournamentVariables,
  UpdateTournamentResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateTournamentVariables) =>
      updateTournamentFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    UpdateTournamentVariables,
    UpdateTournamentResult
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
// useDeleteTournament
// ──────────────────────────────────────────────

type DeleteTournamentVariables = { tournamentId: string };
type DeleteTournamentResult = { success: boolean };

export function useDeleteTournament(): MutationHookReturn<
  DeleteTournamentVariables,
  DeleteTournamentResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteTournamentVariables) =>
      deleteTournamentFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    DeleteTournamentVariables,
    DeleteTournamentResult
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
// useCreateGuestPerson
// ──────────────────────────────────────────────

type CreateGuestVariables = CreateGuestInput;
type CreateGuestResult = { personId: string };

export function useCreateGuestPerson(): MutationHookReturn<
  CreateGuestVariables,
  CreateGuestResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateGuestVariables) =>
      createGuestPersonFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateGuestVariables, CreateGuestResult>) => {
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
// useUpdateGuest
// ──────────────────────────────────────────────

type UpdateGuestVariables = UpdateGuestInput;
type UpdateGuestResult = { success: boolean };

export function useUpdateGuest(): MutationHookReturn<
  UpdateGuestVariables,
  UpdateGuestResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateGuestVariables) =>
      updateGuestFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdateGuestVariables, UpdateGuestResult>) => {
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
// useDeleteGuest
// ──────────────────────────────────────────────

type DeleteGuestVariables = DeleteGuestInput;
type DeleteGuestResult = { success: boolean };

export function useDeleteGuest(): MutationHookReturn<
  DeleteGuestVariables,
  DeleteGuestResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteGuestVariables) =>
      deleteGuestFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteGuestVariables, DeleteGuestResult>) => {
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
// useAddParticipant
// ──────────────────────────────────────────────

type AddParticipantVariables = AddParticipantInput;
type AddParticipantResult = { participantId: string };

export function useAddParticipant(): MutationHookReturn<
  AddParticipantVariables,
  AddParticipantResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AddParticipantVariables) =>
      addParticipantFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<AddParticipantVariables, AddParticipantResult>) => {
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
// useUpdateParticipant
// ──────────────────────────────────────────────

type UpdateParticipantVariables = UpdateParticipantInput;
type UpdateParticipantResult = { success: boolean };

export function useUpdateParticipant(): MutationHookReturn<
  UpdateParticipantVariables,
  UpdateParticipantResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateParticipantVariables) =>
      updateParticipantFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    UpdateParticipantVariables,
    UpdateParticipantResult
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
// useRemoveParticipant
// ──────────────────────────────────────────────

type RemoveParticipantVariables = { participantId: string };
type RemoveParticipantResult = { success: boolean };

export function useRemoveParticipant(): MutationHookReturn<
  RemoveParticipantVariables,
  RemoveParticipantResult
> {
  const mutation = useMutation({
    mutationFn: (variables: RemoveParticipantVariables) =>
      removeParticipantFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    RemoveParticipantVariables,
    RemoveParticipantResult
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
// useEnsureMyPerson
// ──────────────────────────────────────────────

/**
 * Ensures the current user has a person record, creating one if needed.
 * No input variables — this is a POST with no body.
 */
type EnsureMyPersonVariables = void;
type EnsureMyPersonResult = {
  id: string;
  displayName: string;
  userId: string | null;
  currentHandicap: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export function useEnsureMyPerson(): MutationHookReturn<
  EnsureMyPersonVariables,
  EnsureMyPersonResult
> {
  const mutation = useMutation({
    mutationFn: () => ensureMyPersonFn(),
  });

  const mutate = async ({
    variables: _variables,
    onSuccess,
    onError,
  }: MutationCallOptions<EnsureMyPersonVariables, EnsureMyPersonResult>) => {
    try {
      const result = await mutation.mutateAsync(undefined);
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
// useLockTournament
// ──────────────────────────────────────────────

type LockTournamentVariables = { tournamentId: string };
type LockTournamentResult = { success: boolean };

export function useLockTournament(): MutationHookReturn<
  LockTournamentVariables,
  LockTournamentResult
> {
  const mutation = useMutation({
    mutationFn: (variables: LockTournamentVariables) =>
      lockTournamentFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<LockTournamentVariables, LockTournamentResult>) => {
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
// useUnlockTournament
// ──────────────────────────────────────────────

type UnlockTournamentVariables = { tournamentId: string };
type UnlockTournamentResult = { success: boolean };

export function useUnlockTournament(): MutationHookReturn<
  UnlockTournamentVariables,
  UnlockTournamentResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UnlockTournamentVariables) =>
      unlockTournamentFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    UnlockTournamentVariables,
    UnlockTournamentResult
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
// useJoinTournamentByCode
// ──────────────────────────────────────────────

type JoinByCodeVariables = JoinByCodeInput;
type JoinByCodeResult = {
  tournamentId: string;
  tournamentName: string;
  alreadyJoined?: boolean;
};

export function useJoinTournamentByCode(): MutationHookReturn<
  JoinByCodeVariables,
  JoinByCodeResult
> {
  const mutation = useMutation({
    mutationFn: (variables: JoinByCodeVariables) =>
      joinTournamentByCodeFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<JoinByCodeVariables, JoinByCodeResult>) => {
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
