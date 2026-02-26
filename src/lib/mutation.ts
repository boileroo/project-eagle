/**
 * Shared types for Apollo-style mutation hooks.
 *
 * Each domain file (courses.ts, tournaments.ts, etc.) defines hooks that
 * return a `[mutate, state]` tuple. The `mutate` function accepts per-call
 * options so callers can provide `onSuccess` / `onError` callbacks at the
 * call site rather than at hook definition time.
 */

/**
 * Options passed to the mutation function at each call site.
 *
 * @template TVariables - The flat domain variables (e.g. `{ courseId: string }`)
 * @template TResult    - The return type of the server function
 */
export type MutationCallOptions<TVariables, TResult = unknown> = {
  variables: TVariables;
  onSuccess?: (result: TResult) => void | Promise<void>;
  onError?: (error: Error) => void;
};

/**
 * The return tuple shape for all mutation hooks.
 *
 * @template TVariables - The flat domain variables
 * @template TResult    - The return type of the server function
 */
export type MutationHookReturn<TVariables, TResult = unknown> = readonly [
  (options: MutationCallOptions<TVariables, TResult>) => Promise<void>,
  { isPending: boolean; isError: boolean; error: Error | null },
];
