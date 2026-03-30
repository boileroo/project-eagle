import { useMutation } from '@tanstack/react-query';
import { createEventFn } from './wizard.server';
import type { CreateEventInput } from './validators';
import type { MutationCallOptions, MutationHookReturn } from './mutation';

type CreateEventVariables = CreateEventInput;
type CreateEventResult = { tournamentId: string; firstRoundId: string };

export function useCreateEvent(): MutationHookReturn<
  CreateEventVariables,
  CreateEventResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateEventVariables) =>
      createEventFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateEventVariables, CreateEventResult>) => {
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
      error: mutation.error instanceof Error ? mutation.error : null,
    },
  ] as const;
}
