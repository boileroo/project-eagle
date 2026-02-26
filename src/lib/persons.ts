import { useMutation } from '@tanstack/react-query';
import { updateMyAccountFn } from '@/lib/persons.server';
import type { UpdateAccountInput } from '@/lib/validators';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useUpdateMyAccount
// ──────────────────────────────────────────────

type UpdateMyAccountVariables = UpdateAccountInput;
type UpdateMyAccountResult = { success: boolean };

export function useUpdateMyAccount(): MutationHookReturn<
  UpdateMyAccountVariables,
  UpdateMyAccountResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateMyAccountVariables) =>
      updateMyAccountFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdateMyAccountVariables, UpdateMyAccountResult>) => {
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
