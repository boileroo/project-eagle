export * from './game-config';

import { useMutation } from '@tanstack/react-query';
import type { GameConfig } from './game-config';
import {
  createGameFn,
  updateGameFn,
  deleteGameFn,
  awardSideGameFn,
  removeSideGameAwardFn,
  createSideGameFn,
  deleteSideGameFn,
} from '@/lib/games.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

type CreateGameVariables = {
  tournamentId: string;
  roundId: string;
  groupId: string;
  name: string;
  gameConfig: GameConfig;
};
type CreateGameResult = Awaited<ReturnType<typeof createGameFn>>;

export function useCreateGame(): MutationHookReturn<
  CreateGameVariables,
  CreateGameResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateGameVariables) =>
      createGameFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateGameVariables, CreateGameResult>) => {
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

type UpdateGameVariables = {
  id: string;
  name?: string;
  gameConfig?: GameConfig;
};
type UpdateGameResult = Awaited<ReturnType<typeof updateGameFn>>;

export function useUpdateGame(): MutationHookReturn<
  UpdateGameVariables,
  UpdateGameResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateGameVariables) =>
      updateGameFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdateGameVariables, UpdateGameResult>) => {
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

type DeleteGameVariables = { gameId: string };
type DeleteGameResult = { success: boolean };

export function useDeleteGame(): MutationHookReturn<
  DeleteGameVariables,
  DeleteGameResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteGameVariables) =>
      deleteGameFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteGameVariables, DeleteGameResult>) => {
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

type AwardSideGameVariables = {
  sideGameId: string;
  roundPlayerId: string;
};
type AwardSideGameResult = Awaited<ReturnType<typeof awardSideGameFn>>;

export function useAwardSideGame(): MutationHookReturn<
  AwardSideGameVariables,
  AwardSideGameResult
> {
  const mutation = useMutation({
    mutationFn: (variables: AwardSideGameVariables) =>
      awardSideGameFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<AwardSideGameVariables, AwardSideGameResult>) => {
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

type RemoveSideGameAwardVariables = { sideGameId: string };
type RemoveSideGameAwardResult = Awaited<
  ReturnType<typeof removeSideGameAwardFn>
>;

export function useRemoveSideGameAward(): MutationHookReturn<
  RemoveSideGameAwardVariables,
  RemoveSideGameAwardResult
> {
  const mutation = useMutation({
    mutationFn: (variables: RemoveSideGameAwardVariables) =>
      removeSideGameAwardFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<
    RemoveSideGameAwardVariables,
    RemoveSideGameAwardResult
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

type CreateSideGameVariables = {
  tournamentId: string;
  roundId: string;
  name: string;
  format: 'nearest_pin' | 'longest_drive';
  holeNumber?: number;
  bonusMode?: string;
  bonusPoints?: number;
};
type CreateSideGameResult = Awaited<ReturnType<typeof createSideGameFn>>;

export function useCreateSideGame(): MutationHookReturn<
  CreateSideGameVariables,
  CreateSideGameResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateSideGameVariables) =>
      createSideGameFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateSideGameVariables, CreateSideGameResult>) => {
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

type DeleteSideGameVariables = { sideGameId: string };
type DeleteSideGameResult = { success: boolean };

export function useDeleteSideGame(): MutationHookReturn<
  DeleteSideGameVariables,
  DeleteSideGameResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteSideGameVariables) =>
      deleteSideGameFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteSideGameVariables, DeleteSideGameResult>) => {
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
