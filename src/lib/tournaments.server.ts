import { createServerFn } from '@tanstack/react-start';
import { and, eq, ilike } from 'drizzle-orm';
import { db } from '@/db';
import {
  persons,
  profiles,
  tournamentParticipants,
  tournaments,
} from '@/db/schema';
import { requireAuth, requireCommissioner } from './auth.helpers';
import type {
  AddParticipantInput,
  CreateGuestInput,
  CreateTournamentInput,
  UpdateParticipantInput,
  UpdateTournamentInput,
} from './validators';

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
        teams: {
          with: {
            members: {
              with: {
                participant: {
                  with: {
                    person: true,
                  },
                },
              },
            },
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

    // Auto-add the creator as commissioner
    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });
    if (person) {
      await db.insert(tournamentParticipants).values({
        tournamentId: tournament.id,
        personId: person.id,
        role: 'commissioner',
      });
    }

    return { tournamentId: tournament.id };
  });

// ──────────────────────────────────────────────
// Update a tournament
// ──────────────────────────────────────────────

export const updateTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateTournamentInput) => data)
  .handler(async ({ data }) => {
    await requireCommissioner(data.id);

    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.id),
    });
    if (!existing) throw new Error('Tournament not found');

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
    await requireCommissioner(data.tournamentId);

    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!existing) throw new Error('Tournament not found');

    // Cascades to participants, teams, rounds, etc.
    await db.delete(tournaments).where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Search persons (for adding to a tournament)
// ──────────────────────────────────────────────

export const searchPersonsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string; tournamentId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    // Get existing participant personIds so we can exclude them
    const existing = await db.query.tournamentParticipants.findMany({
      where: eq(tournamentParticipants.tournamentId, data.tournamentId),
      columns: { personId: true },
    });
    const existingPersonIds = new Set(existing.map((p) => p.personId));

    // Search persons by display name
    const results = await db.query.persons.findMany({
      where: ilike(persons.displayName, `%${data.query}%`),
      with: {
        user: true,
      },
      limit: 20,
    });

    // Filter out persons already in the tournament
    return results
      .filter((p) => !existingPersonIds.has(p.id))
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        currentHandicap: p.currentHandicap,
        isGuest: p.userId == null,
        email: p.user?.email ?? null,
      }));
  });

// ──────────────────────────────────────────────
// Create a guest person (no user account)
// ──────────────────────────────────────────────

export const createGuestPersonFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateGuestInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const [person] = await db
      .insert(persons)
      .values({
        displayName: data.displayName,
        currentHandicap: data.currentHandicap?.toString() ?? null,
        createdByUserId: user.id,
        // userId is null → this is a guest
      })
      .returning();

    return { personId: person.id };
  });

// ──────────────────────────────────────────────
// Add a participant to a tournament
// ──────────────────────────────────────────────

export const addParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator((data: AddParticipantInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Look up person to check if this is a self-join
    const person = await db.query.persons.findFirst({
      where: eq(persons.id, data.personId),
    });
    if (!person) throw new Error('Person not found');

    const isSelfJoin = person.userId === user.id;

    // Verify tournament exists
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');

    const isCreator = tournament.createdByUserId === user.id;

    if (isSelfJoin) {
      // Creator can join as commissioner; others self-join as player only
      if (
        data.role &&
        data.role !== 'player' &&
        !(data.role === 'commissioner' && isCreator)
      ) {
        throw new Error('You can only join as a player');
      }
    } else {
      // Adding someone else: require commissioner (or creator)
      if (!isCreator) {
        await requireCommissioner(data.tournamentId);
      }
    }

    // Check person isn't already a participant
    const existingParticipant = await db.query.tournamentParticipants.findFirst(
      {
        where: and(
          eq(tournamentParticipants.tournamentId, data.tournamentId),
          eq(tournamentParticipants.personId, data.personId),
        ),
      },
    );
    if (existingParticipant) throw new Error('Person is already a participant');

    const role = isSelfJoin ? 'player' : (data.role ?? 'player');

    // Guests can only be player or spectator
    if (
      person.userId == null &&
      (role === 'commissioner' || role === 'marker')
    ) {
      throw new Error('Guests can only be assigned player or spectator roles');
    }

    // If adding as commissioner, demote any existing commissioner to player
    if (role === 'commissioner') {
      await db
        .update(tournamentParticipants)
        .set({ role: 'player' })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, data.tournamentId),
            eq(tournamentParticipants.role, 'commissioner'),
          ),
        );
    }

    const [participant] = await db
      .insert(tournamentParticipants)
      .values({
        tournamentId: data.tournamentId,
        personId: data.personId,
        role,
        handicapOverride: data.handicapOverride?.toString() ?? null,
      })
      .returning();

    return { participantId: participant.id };
  });

// ──────────────────────────────────────────────
// Update a participant (role, handicap override)
// ──────────────────────────────────────────────

export const updateParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateParticipantInput) => data)
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentParticipants.findFirst({
      where: eq(tournamentParticipants.id, data.participantId),
      with: { person: true },
    });
    if (!existing) throw new Error('Participant not found');

    await requireCommissioner(existing.tournamentId);

    // Guest role restriction
    if (
      data.role !== undefined &&
      existing.person.userId == null &&
      (data.role === 'commissioner' || data.role === 'marker')
    ) {
      throw new Error('Guests can only be assigned player or spectator roles');
    }

    // If promoting to commissioner, demote existing commissioner to player
    if (data.role === 'commissioner' && existing.role !== 'commissioner') {
      await db
        .update(tournamentParticipants)
        .set({ role: 'player' })
        .where(
          and(
            eq(tournamentParticipants.tournamentId, existing.tournamentId),
            eq(tournamentParticipants.role, 'commissioner'),
          ),
        );
    }

    const updates: Record<string, unknown> = {};
    if (data.role !== undefined) updates.role = data.role;
    if (data.handicapOverride !== undefined)
      updates.handicapOverride = data.handicapOverride?.toString() ?? null;

    if (Object.keys(updates).length > 0) {
      await db
        .update(tournamentParticipants)
        .set(updates)
        .where(eq(tournamentParticipants.id, data.participantId));
    }

    return { success: true };
  });

// ──────────────────────────────────────────────
// Remove a participant from a tournament
// ──────────────────────────────────────────────

export const removeParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { participantId: string }) => data)
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentParticipants.findFirst({
      where: eq(tournamentParticipants.id, data.participantId),
    });
    if (!existing) throw new Error('Participant not found');

    await requireCommissioner(existing.tournamentId);

    await db
      .delete(tournamentParticipants)
      .where(eq(tournamentParticipants.id, data.participantId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Get current user's person record (for "Add Myself")
// ──────────────────────────────────────────────

export const getMyPersonFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });

    return person ?? null;
  },
);

// ──────────────────────────────────────────────
// Ensure current user has a person record (create if missing)
// ──────────────────────────────────────────────

export const ensureMyPersonFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await requireAuth();

    const existing = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });
    if (existing) return existing;

    // Look up profile for display name
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });
    const displayName = profile?.displayName || profile?.email || 'Unknown';

    const [person] = await db
      .insert(persons)
      .values({
        displayName,
        userId: user.id,
        createdByUserId: user.id,
      })
      .returning();

    return person;
  },
);
