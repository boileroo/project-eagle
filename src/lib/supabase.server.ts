import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { setCookie } from '@tanstack/react-start/server';

export function createSupabaseServerClient(request: Request) {
  const supabase = createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
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
              httpOnly: true,
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
