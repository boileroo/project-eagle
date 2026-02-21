import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { setCookie } from '@tanstack/react-start/server';
import { env } from './env';

export function createSupabaseServerClient(request: Request) {
  const supabase = createServerClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, {
              path: options?.path ?? '/',
              httpOnly: options?.httpOnly ?? false,
              sameSite: (options?.sameSite as 'lax') ?? 'lax',
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
              maxAge: options?.maxAge,
            });
          });
        },
      },
    },
  );

  return { supabase };
}
