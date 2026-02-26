import { useMutation } from '@tanstack/react-query';
import {
  createTeamFn,
  updateTeamFn,
  deleteTeamFn,
  addTeamMemberFn,
  removeTeamMemberFn,
  deleteAllTeamsFn,
} from '@/lib/teams.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useCreateTeam
// ──────────────────────────────────────────────

type CreateTeamVariables = {
  tournamentId: string;
  name: string;
};
type CreateTeamResult = { teamId: string };

export function useCreateTeam(): MutationHookReturn<
  CreateTeamVariables,
  CreateTeamResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateTeamVariables) =>
      createTeamFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateTeamVariables, CreateTeamResult>) => {
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
// useUpdateTeam
// ──────────────────────────────────────────────

type UpdateTeamVariables = {
  teamId: string;
  name: string;
};
type UpdateTeamResult = { success: boolean };

export function useUpdateTeam(): MutationHookReturn<
  UpdateTeamVariables,
  UpdateTeamResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateTeamVariables) =>
      updateTeamFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdateTeamVariables, UpdateTeamResult>) => {
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
// useDeleteTeam
// ──────────────────────────────────────────────

type DeleteTeamVariables = {
  teamId: string;
};
type DeleteTeamResult = { success: boolean };

export function useDeleteTeam(): MutationHookReturn<
  DeleteTeamVariables,
  DeleteTeamResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteTeamVariables) =>
      deleteTeamFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteTeamVariables, DeleteTeamResult>) => {
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
// useAddTeamMember
// ──────────────────────────────────────────────

type AddTeamMemberVariables = {
  teamId: string;
  participantId: string;
};
type AddTeamMemberResult = { memberId: string };

export function useAddTeamMember(): MutationHookReturn<
  AddTeamMemberVariables,
  AddTeamMemberResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AddTeamMemberVariables) =>
      addTeamMemberFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<AddTeamMemberVariables, AddTeamMemberResult>) => {
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
// useRemoveTeamMember
// ──────────────────────────────────────────────

type RemoveTeamMemberVariables = {
  memberId: string;
};
type RemoveTeamMemberResult = { success: boolean };

export function useRemoveTeamMember(): MutationHookReturn<
  RemoveTeamMemberVariables,
  RemoveTeamMemberResult
> {
  const mutation = useMutation({
    mutationFn: (variables: RemoveTeamMemberVariables) =>
      removeTeamMemberFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    RemoveTeamMemberVariables,
    RemoveTeamMemberResult
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
// useDeleteAllTeams
// ──────────────────────────────────────────────

type DeleteAllTeamsVariables = {
  tournamentId: string;
};
type DeleteAllTeamsResult = { success: boolean };

export function useDeleteAllTeams(): MutationHookReturn<
  DeleteAllTeamsVariables,
  DeleteAllTeamsResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteAllTeamsVariables) =>
      deleteAllTeamsFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteAllTeamsVariables, DeleteAllTeamsResult>) => {
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
