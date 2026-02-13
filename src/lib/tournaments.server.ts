import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { tournaments } from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import type {
  CreateTournamentInput,
  UpdateTournamentInput,
} from './validators';

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
// List all tournaments
// ──────────────────────────────────────────────

export const getTournamentsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const allTournaments = await db.query.tournaments.findMany({
      orderBy: (tournaments, { desc }) => [desc(tournaments.createdAt)],
      with: {
        participants: true,
        rounds: true,
      },
    });
    return allTournaments;
  },
);

// ──────────────────────────────────────────────
// Get a single tournament with related data
// ──────────────────────────────────────────────

export const getTournamentFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { tournamentId: string }) => data)
  .handler(async ({ data }) => {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
      with: {
        participants: {
          with: {
            person: true,
          },
        },
        rounds: {
          orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
          with: {
            course: true,
          },
        },
      },
    });
    if (!tournament) throw new Error('Tournament not found');
    return tournament;
  });

// ──────────────────────────────────────────────
// Create a tournament
// ──────────────────────────────────────────────

export const createTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateTournamentInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: data.name,
        description: data.description || null,
        createdByUserId: user.id,
      })
      .returning();

    return { tournamentId: tournament.id };
  });

// ──────────────────────────────────────────────
// Update a tournament
// ──────────────────────────────────────────────

export const updateTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateTournamentInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.id),
    });
    if (!existing) throw new Error('Tournament not found');
    if (existing.createdByUserId !== user.id) {
      throw new Error('You can only edit tournaments you created');
    }

    await db
      .update(tournaments)
      .set({
        name: data.name,
        description: data.description || null,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, data.id));

    return { tournamentId: data.id };
  });

// ──────────────────────────────────────────────
// Delete a tournament
// ──────────────────────────────────────────────

export const deleteTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { tournamentId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!existing) throw new Error('Tournament not found');
    if (existing.createdByUserId !== user.id) {
      throw new Error('You can only delete tournaments you created');
    }

    // Cascades to participants, teams, rounds, etc.
    await db.delete(tournaments).where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });
