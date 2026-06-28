import { useMutation } from '@tanstack/react-query';
import {
  createRoundGroupFn,
  deleteRoundGroupFn,
  assignPlayerToGroupFn,
  autoAssignGroupsFn,
} from '@/lib/groups.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

type CreateRoundGroupVariables = {
  roundId: string;
  groupNumber: number;
  name?: string;
};
type CreateRoundGroupResult = {
  id: string;
  roundId: string;
  groupNumber: number;
  name: string | null;
  createdAt: Date;
};

export function useCreateRoundGroup(): MutationHookReturn<
  CreateRoundGroupVariables,
  CreateRoundGroupResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateRoundGroupVariables) =>
      createRoundGroupFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    CreateRoundGroupVariables,
    CreateRoundGroupResult
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

type DeleteRoundGroupVariables = {
  groupId: string;
};
type DeleteRoundGroupResult = { success: boolean };

export function useDeleteRoundGroup(): MutationHookReturn<
  DeleteRoundGroupVariables,
  DeleteRoundGroupResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteRoundGroupVariables) =>
      deleteRoundGroupFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    DeleteRoundGroupVariables,
    DeleteRoundGroupResult
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

type AssignPlayerToGroupVariables = {
  roundPlayerId: string;
  groupId: string | null;
};
type AssignPlayerToGroupResult = { success: boolean };

export function useAssignPlayerToGroup(): MutationHookReturn<
  AssignPlayerToGroupVariables,
  AssignPlayerToGroupResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AssignPlayerToGroupVariables) =>
      assignPlayerToGroupFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    AssignPlayerToGroupVariables,
    AssignPlayerToGroupResult
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

type AutoAssignGroupsVariables = {
  roundId: string;
  groupSize?: number;
};
type AutoAssignGroupsResult = {
  groups: Array<{
    id: string;
    roundId: string;
    groupNumber: number;
    name: string | null;
    createdAt: Date;
  }>;
};

export function useAutoAssignGroups(): MutationHookReturn<
  AutoAssignGroupsVariables,
  AutoAssignGroupsResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AutoAssignGroupsVariables) =>
      autoAssignGroupsFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    AutoAssignGroupsVariables,
    AutoAssignGroupsResult
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
