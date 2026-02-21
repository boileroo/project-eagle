import { createServerFn } from '@tanstack/react-start';
import { and, eq, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  persons,
  profiles,
  roundGroups,
  roundParticipants,
  rounds,
  tournamentParticipants,
  tournaments,
} from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  requireTournamentParticipant,
} from './auth.helpers';
import {
  addParticipantSchema,
  createGuestSchema,
  createTournamentSchema,
  updateParticipantSchema,
  updateTournamentSchema,
} from './validators';
import { isTournamentInSetup } from './tournament-status';
import { safeHandler } from './server-utils';

// ──────────────────────────────────────────────
// Helper: require tournament to be in setup status
// ──────────────────────────────────────────────

async function requireSetup(tournamentId: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { status: true },
  });
  if (!tournament) throw new Error('Tournament not found');
  if (!isTournamentInSetup(tournament.status)) {
    throw new Error(
      'This action is only available while the tournament is in setup',
    );
  }
  return tournament;
}

// ──────────────────────────────────────────────
// List all tournaments
// ──────────────────────────────────────────────

export const getTournamentsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAuth();
    const allTournaments = await db.query.tournaments.findMany({
      where: eq(tournaments.isSingleRound, false),
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
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
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
  .inputValidator(createTournamentSchema)
  .handler(
    safeHandler(async ({ data }) => {
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
    }),
  );

// ──────────────────────────────────────────────
// Update a tournament
// ──────────────────────────────────────────────

export const updateTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(updateTournamentSchema)
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
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);
    await requireSetup(data.tournamentId);

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
  .inputValidator(
    z.object({
      query: z.string().max(100),
      tournamentId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAuth();

    // Get existing participant personIds so we can exclude them
    const existing = await db.query.tournamentParticipants.findMany({
      where: eq(tournamentParticipants.tournamentId, data.tournamentId),
      columns: { personId: true },
    });
    const existingPersonIds = new Set(existing.map((p) => p.personId));

    // Escape ILIKE metacharacters to prevent wildcard injection
    const escapedQuery = data.query.replace(/[%_\\]/g, (c) => `\\${c}`);

    // Search persons by display name
    const results = await db.query.persons.findMany({
      where: ilike(persons.displayName, `%${escapedQuery}%`),
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
  .inputValidator(createGuestSchema)
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
  .inputValidator(addParticipantSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      // Look up person to check if this is a self-join
      const person = await db.query.persons.findFirst({
        where: eq(persons.id, data.personId),
      });
      if (!person) throw new Error('Person not found');

      const isSelfJoin = person.userId === user.id;

      // Verify tournament exists and is in setup
      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, data.tournamentId),
      });
      if (!tournament) throw new Error('Tournament not found');
      if (!isTournamentInSetup(tournament.status)) {
        throw new Error(
          'Cannot add participants once the tournament has left setup',
        );
      }

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

      return db.transaction(async (tx) => {
        // Check person isn't already a participant
        const existingParticipant =
          await tx.query.tournamentParticipants.findFirst({
            where: and(
              eq(tournamentParticipants.tournamentId, data.tournamentId),
              eq(tournamentParticipants.personId, data.personId),
            ),
          });
        if (existingParticipant)
          throw new Error('Person is already a participant');

        const role = isSelfJoin ? 'player' : (data.role ?? 'player');

        // Guests can only be players
        if (
          person.userId == null &&
          (role === 'commissioner' || role === 'marker')
        ) {
          throw new Error('Guests can only be assigned the player role');
        }

        // If adding as commissioner, demote any existing commissioner to player
        if (role === 'commissioner') {
          await tx
            .update(tournamentParticipants)
            .set({ role: 'player' })
            .where(
              and(
                eq(tournamentParticipants.tournamentId, data.tournamentId),
                eq(tournamentParticipants.role, 'commissioner'),
              ),
            );
        }

        const [participant] = await tx
          .insert(tournamentParticipants)
          .values({
            tournamentId: data.tournamentId,
            personId: data.personId,
            role,
            handicapOverride: data.handicapOverride?.toString() ?? null,
          })
          .returning();

        // Auto-add to all draft/open rounds in this tournament
        const openRounds = await tx.query.rounds.findMany({
          where: and(
            eq(rounds.tournamentId, data.tournamentId),
            eq(rounds.status, 'draft'),
          ),
        });

        for (const round of openRounds) {
          const [rp] = await tx
            .insert(roundParticipants)
            .values({
              roundId: round.id,
              personId: data.personId,
              tournamentParticipantId: participant.id,
              handicapSnapshot:
                data.handicapOverride?.toString() ??
                person.currentHandicap ??
                '0',
            })
            .returning();

          // Auto-assign to default group if there's exactly one
          const groups = await tx.query.roundGroups.findMany({
            where: eq(roundGroups.roundId, round.id),
          });
          if (groups.length === 1) {
            await tx
              .update(roundParticipants)
              .set({ roundGroupId: groups[0].id })
              .where(eq(roundParticipants.id, rp.id));
          }
        }

        return { participantId: participant.id };
      });
    }),
  );

// ──────────────────────────────────────────────

export const updateParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator(updateParticipantSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentParticipants.findFirst({
      where: eq(tournamentParticipants.id, data.participantId),
      with: { person: true },
    });
    if (!existing) throw new Error('Participant not found');

    await requireCommissioner(existing.tournamentId);
    await requireSetup(existing.tournamentId);

    // Cannot change the role of a commissioner
    if (data.role !== undefined && existing.role === 'commissioner') {
      throw new Error('The commissioner role cannot be changed');
    }

    // Guests can only be players
    if (
      data.role !== undefined &&
      existing.person.userId == null &&
      data.role === 'marker'
    ) {
      throw new Error('Guests can only be assigned the player role');
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
  .inputValidator(z.object({ participantId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentParticipants.findFirst({
      where: eq(tournamentParticipants.id, data.participantId),
    });
    if (!existing) throw new Error('Participant not found');

    await requireCommissioner(existing.tournamentId);
    await requireSetup(existing.tournamentId);

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

// ──────────────────────────────────────────────
// Lock tournament (setup → scheduled)
// Bulk-transitions all draft rounds to scheduled
// ──────────────────────────────────────────────

export const lockTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'setup') {
      throw new Error('Tournament is already locked');
    }

    // Require at least one round to lock
    const tournamentRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, data.tournamentId),
    });
    if (tournamentRounds.length === 0) {
      throw new Error(
        'Cannot lock a tournament with no rounds. Add at least one round first.',
      );
    }

    // Bulk-transition all draft rounds to scheduled
    await db
      .update(rounds)
      .set({ status: 'scheduled', updatedAt: new Date() })
      .where(
        and(
          eq(rounds.tournamentId, data.tournamentId),
          eq(rounds.status, 'draft'),
        ),
      );

    // Update tournament status
    await db
      .update(tournaments)
      .set({ status: 'scheduled', updatedAt: new Date() })
      .where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Unlock tournament (scheduled → setup)
// Reverts all scheduled rounds back to draft
// ──────────────────────────────────────────────

export const unlockTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'scheduled') {
      throw new Error(
        'Can only unlock a tournament that is in scheduled status',
      );
    }

    // Revert all scheduled rounds to draft
    await db
      .update(rounds)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(
        and(
          eq(rounds.tournamentId, data.tournamentId),
          eq(rounds.status, 'scheduled'),
        ),
      );

    // Update tournament status
    await db
      .update(tournaments)
      .set({ status: 'setup', updatedAt: new Date() })
      .where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });
