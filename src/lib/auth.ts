import { useMutation } from '@tanstack/react-query';
import { signInFn, signUpFn, signOutFn } from '@/lib/auth.server';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useSignIn
// ──────────────────────────────────────────────
// Auth functions return `{ error: string | null }` instead of throwing.
// The hook converts returned errors into thrown errors so the standard
// `onError` callback works consistently.

type SignInVariables = { email: string; password: string };
type SignInResult = { error: null };

export function useSignIn(): MutationHookReturn<SignInVariables, SignInResult> {
  const mutation = useMutation({
    mutationFn: async (variables: SignInVariables) => {
      const result = await signInFn({ data: variables });
      if (result.error) throw new Error(result.error);
      return result as SignInResult;
    },
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<SignInVariables, SignInResult>) => {
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
// useSignUp
// ──────────────────────────────────────────────

type SignUpVariables = {
  email: string;
  password: string;
  displayName: string;
};
type SignUpResult = { error: null };

export function useSignUp(): MutationHookReturn<SignUpVariables, SignUpResult> {
  const mutation = useMutation({
    mutationFn: async (variables: SignUpVariables) => {
      const result = await signUpFn({ data: variables });
      if (result.error) throw new Error(result.error);
      return result as SignUpResult;
    },
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<SignUpVariables, SignUpResult>) => {
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
// useSignOut
// ──────────────────────────────────────────────

type SignOutResult = { success: boolean };

export function useSignOut() {
  const mutation = useMutation({
    mutationFn: () => signOutFn(),
  });

  const mutate = async (options?: {
    onSuccess?: (result: SignOutResult) => void | Promise<void>;
    onError?: (error: Error) => void;
  }) => {
    try {
      const result = await mutation.mutateAsync();
      await options?.onSuccess?.(result);
    } catch (error) {
      options?.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
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
