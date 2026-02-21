import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import { checkRateLimit } from './rate-limit';

// ──────────────────────────────────────────────
// Get the current authenticated user (or null)
// ──────────────────────────────────────────────

export const getAuthUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest();
    const { supabase } = createSupabaseServerClient(request);

    const [
      {
        data: { user },
      },
      {
        data: { session },
      },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    if (!user) return null;

    const profileRows = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    return {
      id: user.id,
      email: user.email!,
      displayName: profileRows[0]?.displayName ?? null,
      accessToken: session?.access_token ?? null,
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

    // Rate limit: 5 sign-up attempts per email per 15 minutes
    const key = `signup:${data.email.toLowerCase()}`;
    if (!checkRateLimit(key, 5, 15 * 60 * 1000)) {
      return { error: 'Too many sign-up attempts. Please try again later.' };
    }

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
    z.object({ email: z.string().email(), password: z.string().min(8) }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();

    // Rate limit: 10 sign-in attempts per email per 15 minutes
    const key = `signin:${data.email.toLowerCase()}`;
    if (!checkRateLimit(key, 10, 15 * 60 * 1000)) {
      return { error: 'Too many sign-in attempts. Please try again later.' };
    }

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
