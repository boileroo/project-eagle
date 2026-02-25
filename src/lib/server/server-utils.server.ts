/**
 * safeHandler — wraps a server function handler to catch and sanitise
 * unexpected database errors so internal details (table names, constraint
 * names, column names) are never leaked to the client.
 *
 * Intentional user-facing errors (plain Error without a DB code) are
 * re-thrown as-is. Postgres/Drizzle errors are detected by their 5-char
 * SQLSTATE code, logged server-side, and replaced with a generic message.
 *
 * Usage:
 *   .handler(safeHandler(async ({ data }) => { ... }))
 */

function isDbError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string' &&
    /^[0-9A-Z]{5}$/.test((err as Record<string, unknown>).code as string)
  );
}

// Single-arg generic avoids the `any[]` constraint that breaks TanStack
// Start's contextual type inference for the { data } parameter.
export function safeHandler<TArg, TResult>(
  fn: (arg: TArg) => Promise<TResult>,
): (arg: TArg) => Promise<TResult> {
  return async (arg: TArg) => {
    try {
      return await fn(arg);
    } catch (err) {
      // Re-throw intentional user-facing errors (no DB error code)
      if (err instanceof Error && !isDbError(err)) {
        throw err;
      }
      // Log the original for server-side diagnosis, return a safe message
      console.error('[server] Unexpected error:', err);
      throw new Error('An unexpected error occurred. Please try again.');
    }
  };
}

// No-arg variant for handlers without an inputValidator.
export function safeHandlerNoArg<TResult>(
  fn: () => Promise<TResult>,
): () => Promise<TResult> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Error && !isDbError(err)) {
        throw err;
      }
      console.error('[server] Unexpected error:', err);
      throw new Error('An unexpected error occurred. Please try again.');
    }
  };
}
