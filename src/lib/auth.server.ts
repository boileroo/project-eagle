import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { createSupabaseServerClient } from './supabase.server';

// ──────────────────────────────────────────────
// Get the current authenticated user (or null)
// ──────────────────────────────────────────────

export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest();
    const { supabase } = createSupabaseServerClient(request);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email!,
    };
  },
);

// ──────────────────────────────────────────────
// Sign up with email + password
// ──────────────────────────────────────────────

export const signUpFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const { supabase } = createSupabaseServerClient(request);

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (!authData.user) {
      return { error: 'Something went wrong during sign up' };
    }

    // Cookies are set via setCookie() in the supabase.server.ts setAll callback
    return { error: null };
  });

// ──────────────────────────────────────────────
// Sign in with email + password
// ──────────────────────────────────────────────

export const signInFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({ email: z.string().email(), password: z.string().min(1) }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    const { supabase } = createSupabaseServerClient(request);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return { error: error.message };
    }

    // Cookies are set via setCookie() in the supabase.server.ts setAll callback
    return { error: null };
  });

// ──────────────────────────────────────────────
// Sign out
// ──────────────────────────────────────────────

export const signOutFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const request = getRequest();
    const { supabase } = createSupabaseServerClient(request);

    await supabase.auth.signOut();

    // Cookies are cleared via setCookie() in the supabase.server.ts setAll callback
    return { success: true };
  },
);
