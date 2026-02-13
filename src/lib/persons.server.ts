import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { persons, profiles } from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import type { UpdateAccountInput } from './validators';

// ──────────────────────────────────────────────
// Helper: get authenticated user or throw
// ──────────────────────────────────────────────

async function requireAuth() {
  const request = getRequest();
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

// ──────────────────────────────────────────────
// Get the current user's person record + profile
// ──────────────────────────────────────────────

export const getMyAccountFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    if (!profile) throw new Error('Profile not found');

    return {
      profile,
      person: person ?? null,
    };
  },
);

// ──────────────────────────────────────────────
// Update the current user's account (display name + handicap)
// ──────────────────────────────────────────────

export const updateMyAccountFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateAccountInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Update profile display name
    await db
      .update(profiles)
      .set({
        displayName: data.displayName,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id));

    // Update person record (handicap + display name)
    const existingPerson = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });

    if (existingPerson) {
      await db
        .update(persons)
        .set({
          displayName: data.displayName,
          currentHandicap: data.currentHandicap?.toString() ?? null,
          updatedAt: new Date(),
        })
        .where(eq(persons.id, existingPerson.id));
    } else {
      // Edge case: person record wasn't created by trigger (e.g. existing users)
      await db.insert(persons).values({
        displayName: data.displayName,
        userId: user.id,
        createdByUserId: user.id,
        currentHandicap: data.currentHandicap?.toString() ?? null,
      });
    }

    return { success: true };
  });
