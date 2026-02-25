/**
 * Runtime environment variable validation.
 *
 * Import this module early in the server entry point (or at the top of
 * db/index.ts) so misconfigured deployments fail fast with a clear message
 * rather than a cryptic runtime error deep inside a handler.
 *
 * Usage:
 *   import '@/lib/env';  // side-effect: validates on import
 *   // or
 *   import { env } from '@/lib/env';
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Check your .env file against .env.example.`,
    );
  }
  return value;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  VITE_SUPABASE_URL: requireEnv('VITE_SUPABASE_URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY'),
} as const;
