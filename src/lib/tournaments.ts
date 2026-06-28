import { useMutation } from '@tanstack/react-query';
import {
  createTournamentFn,
  updateTournamentFn,
  deleteTournamentFn,
  createGuestPersonFn,
  updateGuestFn,
  deleteGuestFn,
  addPlayerFn,
  updatePlayerFn,
  removePlayerFn,
  ensureMyPersonFn,
  lockTournamentFn,
  unlockTournamentFn,
  joinTournamentByCodeFn,
} from '@/lib/tournaments.server';
import type { getTournamentJoinStateFn } from '@/lib/tournaments.server';
import type {
  CreateTournamentInput,
  UpdateTournamentInput,
  AddPlayerInput,
  UpdatePlayerInput,
  CreateGuestInput,
  UpdateGuestInput,
  DeleteGuestInput,
  JoinByCodeInput,
} from '@/lib/validators';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

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

type AddPlayerVariables = AddPlayerInput;
type AddPlayerResult = { playerId: string };

export function useAddPlayer(): MutationHookReturn<
  AddPlayerVariables,
  AddPlayerResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AddPlayerVariables) =>
      addPlayerFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<AddPlayerVariables, AddPlayerResult>) => {
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

type UpdatePlayerVariables = UpdatePlayerInput;
type UpdatePlayerResult = { success: boolean };

export function useUpdatePlayer(): MutationHookReturn<
  UpdatePlayerVariables,
  UpdatePlayerResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdatePlayerVariables) =>
      updatePlayerFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdatePlayerVariables, UpdatePlayerResult>) => {
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

type RemovePlayerVariables = { playerId: string };
type RemovePlayerResult = { success: boolean };

export function useRemovePlayer(): MutationHookReturn<
  RemovePlayerVariables,
  RemovePlayerResult
> {
  const mutation = useMutation({
    mutationFn: (variables: RemovePlayerVariables) =>
      removePlayerFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<RemovePlayerVariables, RemovePlayerResult>) => {
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

type JoinByCodeVariables = JoinByCodeInput;
type JoinByCodeResult = {
  tournamentId: string;
  tournamentName: string;
  alreadyJoined?: boolean;
  joinedByClaimingGuest?: boolean;
};

export type TournamentJoinState = Awaited<
  ReturnType<typeof getTournamentJoinStateFn>
>;

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
