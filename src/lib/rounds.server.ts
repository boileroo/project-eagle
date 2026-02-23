import { createServerFn } from '@tanstack/react-start';
import { and, eq, count, asc, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  courses,
  rounds,
  roundGroups,
  roundParticipants,
  tournamentParticipants,
  tournaments,
  persons,
  profiles,
} from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  verifyTournamentMembership,
} from './auth.helpers';
import {
  createRoundSchema,
  createSingleRoundSchema,
  updateRoundSchema,
} from './validators';
import { deriveTournamentStatus } from './tournament-status';
import { safeHandler } from './server-utils';

const GOLF_WORDS = [
  'ace',
  'albatross',
  'birdie',
  'bogey',
  'bunker',
  'chip',
  'double',
  'eagle',
  'fairway',
  'green',
  'grip',
  'hook',
  'iron',
  'links',
  'loft',
  'pars',
  'pitch',
  'putt',
  'rough',
  'sand',
  'score',
  'slice',
  'spike',
  'stable',
  'swing',
  'tee',
  'turn',
  'wedge',
  'wood',
  'yard',
  'ace',
  'bogey',
  'eagle',
  'birdie',
];

function generateInviteCode(): string {
  const word =
    GOLF_WORDS[Math.floor(Math.random() * GOLF_WORDS.length)].toUpperCase();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${word}-${suffix}`.toUpperCase();
}

// ──────────────────────────────────────────────
// Helper: re-sort round numbers by date/teeTime
// when any rounds have dates, sort chronologically
// and reassign roundNumber values
// ──────────────────────────────────────────────

async function resortRoundsByDate(tournamentId: string) {
  const allRounds = await db.query.rounds.findMany({
    where: eq(rounds.tournamentId, tournamentId),
    orderBy: [asc(rounds.roundNumber)],
  });

  // Only re-sort if at least two rounds have dates
  const datedRounds = allRounds.filter((r) => r.date != null);
  if (datedRounds.length < 2) return;

  // Sort only the dated rounds chronologically
  const sortedDated = [...datedRounds].sort((a, b) => {
    const aTime = new Date(a.date!).getTime();
    const bTime = new Date(b.date!).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return (a.teeTime ?? '').localeCompare(b.teeTime ?? '');
  });

  // Place sorted dated rounds back into the positions currently occupied by dated rounds
  // This preserves undated round positions
  const sorted = [...allRounds];
  let datedIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].date != null) {
      sorted[i] = sortedDated[datedIdx++];
    }
  }

  // Reassign round numbers
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].roundNumber !== i + 1) {
      await db
        .update(rounds)
        .set({ roundNumber: i + 1 })
        .where(eq(rounds.id, sorted[i].id));
    }
  }
}

// ──────────────────────────────────────────────
// Helper: sync tournament status from round statuses
// ──────────────────────────────────────────────

async function syncTournamentStatus(tournamentId: string) {
  const allRounds = await db.query.rounds.findMany({
    where: eq(rounds.tournamentId, tournamentId),
    columns: { status: true },
  });

  const newStatus = deriveTournamentStatus(allRounds.map((r) => r.status));

  await db
    .update(tournaments)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));
}

// ──────────────────────────────────────────────
// Get active rounds for the current user (dashboard)
// Returns rounds with status 'open' that the user
// participates in, with course + tournament info.
// ──────────────────────────────────────────────

export const getActiveRoundsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    // Find the user's person record
    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
      columns: { id: true },
    });
    if (!person) return [];

    // Find round participations for open rounds
    const activeRPs = await db.query.roundParticipants.findMany({
      where: eq(roundParticipants.personId, person.id),
      with: {
        round: {
          with: {
            course: { columns: { id: true, name: true } },
            tournament: {
              columns: { id: true, name: true, isSingleRound: true },
            },
            participants: { columns: { id: true } },
          },
        },
      },
    });

    return activeRPs
      .filter((rp) => rp.round.status === 'open')
      .map((rp) => ({
        roundId: rp.round.id,
        roundNumber: rp.round.roundNumber,
        tournamentId: rp.round.tournament.id,
        tournamentName: rp.round.tournament.name,
        isSingleRound: rp.round.tournament.isSingleRound,
        courseName: rp.round.course.name,
        participantCount: rp.round.participants.length,
        date: rp.round.date,
        teeTime: rp.round.teeTime,
      }));
  },
);

// ──────────────────────────────────────────────
// List all single rounds (for /rounds page)
// ──────────────────────────────────────────────

export const getSingleRoundsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();
    // Single rounds live inside auto-tournaments with isSingleRound=true
    // Each auto-tournament has exactly one round.
    // Only return tournaments created by (or participated in by) the current user.
    const singleTournaments = await db.query.tournaments.findMany({
      where: and(
        eq(tournaments.isSingleRound, true),
        eq(tournaments.createdByUserId, user.id),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      with: {
        rounds: {
          with: {
            course: true,
            participants: {
              with: { person: true },
            },
          },
        },
      },
    });

    // Flatten: extract the single round from each tournament
    return singleTournaments.map((t) => t.rounds[0]).filter(Boolean);
  },
);

// ──────────────────────────────────────────────
// Get a single round with participants & course
// ──────────────────────────────────────────────

export const getRoundFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      with: {
        course: {
          with: {
            holes: {
              orderBy: (holes, { asc }) => [asc(holes.holeNumber)],
            },
          },
        },
        tournament: {
          with: {
            teams: true,
          },
        },
        groups: {
          orderBy: (g, { asc }) => [asc(g.groupNumber)],
          with: {
            participants: {
              with: { person: true },
            },
          },
        },
        participants: {
          with: {
            person: true,
            tournamentParticipant: {
              with: {
                teamMemberships: {
                  with: { team: true },
                },
              },
            },
          },
          orderBy: (rp, { asc }) => [asc(rp.createdAt)],
        },
      },
    });
    if (!round) throw new Error('Round not found');
    // IDOR: verify the requesting user is a participant in this tournament
    await verifyTournamentMembership(user.id, round.tournamentId);
    return round;
  });

// ──────────────────────────────────────────────
// Create a round (within a tournament)
// ──────────────────────────────────────────────

export const createRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(createRoundSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireCommissioner(data.tournamentId);

      // Only allow creating rounds when tournament is in setup
      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, data.tournamentId),
        columns: { status: true },
      });
      if (!tournament) throw new Error('Tournament not found');
      if (tournament.status !== 'setup') {
        throw new Error('Can only add rounds while the tournament is in setup');
      }

      const result = await db.transaction(async (tx) => {
        // Auto-assign roundNumber as next in sequence
        const [{ value: existingCount }] = await tx
          .select({ value: count() })
          .from(rounds)
          .where(eq(rounds.tournamentId, data.tournamentId));

        const [round] = await tx
          .insert(rounds)
          .values({
            tournamentId: data.tournamentId,
            courseId: data.courseId,
            roundNumber: existingCount + 1,
            date: data.date ? new Date(data.date) : null,
            teeTime: data.teeTime || null,
            format: data.format || null,
            createdByUserId: user.id,
          })
          .returning();

        // Auto-add all tournament participants as round participants
        const tpList = await tx.query.tournamentParticipants.findMany({
          where: eq(tournamentParticipants.tournamentId, data.tournamentId),
          with: {
            person: true,
          },
        });

        if (tpList.length > 0) {
          await tx.insert(roundParticipants).values(
            tpList.map((tp) => ({
              roundId: round.id,
              personId: tp.personId,
              tournamentParticipantId: tp.id,
              handicapSnapshot:
                tp.handicapOverride ?? tp.person.currentHandicap ?? '0',
            })),
          );
        }

        // Create default Group 1 and assign all participants only if more than 4 players
        if (tpList.length > 4) {
          const [defaultGroup] = await tx
            .insert(roundGroups)
            .values({
              roundId: round.id,
              groupNumber: 1,
              name: 'Group 1',
            })
            .returning();

          for (const tp of tpList) {
            await tx
              .update(roundParticipants)
              .set({ roundGroupId: defaultGroup.id })
              .where(
                and(
                  eq(roundParticipants.roundId, round.id),
                  eq(roundParticipants.personId, tp.personId),
                ),
              );
          }
        }

        return { roundId: round.id };
      });

      // Re-sort if dates are present
      await resortRoundsByDate(data.tournamentId);

      return result;
    }),
  );

// ──────────────────────────────────────────────
// Update a round (course, date, tee time)
// ──────────────────────────────────────────────

export const updateRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(updateRoundSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.id),
    });
    if (!existing) throw new Error('Round not found');
    if (existing.status !== 'draft') {
      throw new Error('Can only edit rounds in draft status');
    }

    await requireCommissioner(existing.tournamentId);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.courseId !== undefined) updates.courseId = data.courseId;
    if (data.date !== undefined)
      updates.date = data.date ? new Date(data.date) : null;
    if (data.teeTime !== undefined) updates.teeTime = data.teeTime || null;
    if (data.format !== undefined) updates.format = data.format || null;

    await db.update(rounds).set(updates).where(eq(rounds.id, data.id));

    // Re-sort if dates changed
    if (data.date !== undefined || data.teeTime !== undefined) {
      await resortRoundsByDate(existing.tournamentId);
    }

    return { roundId: data.id };
  });

// ──────────────────────────────────────────────
// Delete a round
// ──────────────────────────────────────────────

export const deleteRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!existing) throw new Error('Round not found');
    if (existing.status !== 'draft') {
      throw new Error('Can only delete rounds in draft status');
    }

    await requireCommissioner(existing.tournamentId);

    await db.delete(rounds).where(eq(rounds.id, data.roundId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Reorder rounds (swap two round numbers)
// ──────────────────────────────────────────────

export const reorderRoundsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tournamentId: z.string().uuid(),
      roundIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    // Fetch the rounds to validate dated-round chronological order
    const allRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, data.tournamentId),
    });
    const roundMap = new Map(allRounds.map((r) => [r.id, r]));

    // Check that dated rounds remain in chronological order in the new sequence
    let lastDatedTime = -Infinity;
    for (const id of data.roundIds) {
      const r = roundMap.get(id);
      if (!r || !r.date) continue;
      const t = new Date(r.date).getTime();
      const teeMinutes = r.teeTime
        ? Number(r.teeTime.split(':')[0]) * 60 + Number(r.teeTime.split(':')[1])
        : 0;
      const fullTime = t + teeMinutes * 60000;
      if (fullTime < lastDatedTime) {
        throw new Error('Dated rounds must remain in chronological order');
      }
      lastDatedTime = fullTime;
    }

    // Update round numbers to match the provided order
    for (let i = 0; i < data.roundIds.length; i++) {
      await db
        .update(rounds)
        .set({ roundNumber: i + 1 })
        .where(eq(rounds.id, data.roundIds[i]));
    }

    return { success: true };
  });

// ──────────────────────────────────────────────
// Transition round status
// ──────────────────────────────────────────────

const validTransitions: Record<string, string[]> = {
  draft: ['scheduled'],
  scheduled: ['open', 'draft'],
  open: ['finalized', 'scheduled'],
  finalized: ['open'], // reopen for corrections
};

export const transitionRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      newStatus: z.enum(['draft', 'scheduled', 'open', 'finalized']),
    }),
  )
  .handler(async ({ data }) => {
    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!existing) throw new Error('Round not found');

    await requireCommissioner(existing.tournamentId);

    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(data.newStatus)) {
      throw new Error(
        `Cannot transition from "${existing.status}" to "${data.newStatus}"`,
      );
    }

    // Sequential guards: check earlier rounds in the same tournament
    if (existing.roundNumber) {
      const earlierRounds = await db.query.rounds.findMany({
        where: and(
          eq(rounds.tournamentId, existing.tournamentId),
          lt(rounds.roundNumber, existing.roundNumber),
        ),
      });

      if (data.newStatus === 'open') {
        // Can't open if an earlier round is still open
        const openEarlier = earlierRounds.find((r) => r.status === 'open');
        if (openEarlier) {
          throw new Error(
            `Cannot open this round while Round ${openEarlier.roundNumber} is still open`,
          );
        }
      }

      if (data.newStatus === 'scheduled') {
        // Can't schedule if an earlier round is still in draft
        const draftEarlier = earlierRounds.find((r) => r.status === 'draft');
        if (draftEarlier) {
          throw new Error(
            `Cannot schedule this round while Round ${draftEarlier.roundNumber} is still in draft`,
          );
        }
      }

      if (data.newStatus === 'finalized') {
        // Can't finalize if an earlier round isn't finalized
        const unfinalized = earlierRounds.find((r) => r.status !== 'finalized');
        if (unfinalized) {
          throw new Error(
            `Cannot finalize this round while Round ${unfinalized.roundNumber} is not finalized`,
          );
        }
      }
    }

    await db
      .update(rounds)
      .set({
        status: data.newStatus as 'draft' | 'scheduled' | 'open' | 'finalized',
        updatedAt: new Date(),
      })
      .where(eq(rounds.id, data.roundId));

    // Auto-sync tournament status based on new round statuses
    await syncTournamentStatus(existing.tournamentId);

    return { success: true };
  });

// ──────────────────────────────────────────────
// Add a participant to a round
// ──────────────────────────────────────────────

export const addRoundParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      personId: z.string().uuid(),
      tournamentParticipantId: z.string().uuid().optional(),
      handicapSnapshot: z.string(),
    }),
  )
  .handler(
    safeHandler(async ({ data }) => {
      // Only allow adding participants in draft or open status
      const round = await db.query.rounds.findFirst({
        where: eq(rounds.id, data.roundId),
      });
      if (!round) throw new Error('Round not found');
      if (round.status !== 'draft') {
        throw new Error('Can only add participants to draft rounds');
      }

      await requireCommissioner(round.tournamentId);

      // Check for duplicates
      const existing = await db.query.roundParticipants.findFirst({
        where: and(
          eq(roundParticipants.roundId, data.roundId),
          eq(roundParticipants.personId, data.personId),
        ),
      });
      if (existing) throw new Error('Person is already in this round');

      const [rp] = await db
        .insert(roundParticipants)
        .values({
          roundId: data.roundId,
          personId: data.personId,
          tournamentParticipantId: data.tournamentParticipantId ?? null,
          handicapSnapshot: data.handicapSnapshot,
        })
        .returning();

      // Auto-assign to group if there's exactly one group (the default)
      const groups = await db.query.roundGroups.findMany({
        where: eq(roundGroups.roundId, data.roundId),
      });
      if (groups.length === 1) {
        await db
          .update(roundParticipants)
          .set({ roundGroupId: groups[0].id })
          .where(eq(roundParticipants.id, rp.id));
      }

      return { roundParticipantId: rp.id };
    }),
  );

// ──────────────────────────────────────────────
// Remove a participant from a round
// ──────────────────────────────────────────────

export const removeRoundParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ roundParticipantId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Only allow removal in draft or open status
    const rp = await db.query.roundParticipants.findFirst({
      where: eq(roundParticipants.id, data.roundParticipantId),
      with: { round: true },
    });
    if (!rp) throw new Error('Participant not found');
    if (rp.round.status !== 'draft') {
      throw new Error('Can only remove participants from draft rounds');
    }

    await requireCommissioner(rp.round.tournamentId);

    await db
      .delete(roundParticipants)
      .where(eq(roundParticipants.id, data.roundParticipantId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Update round participant handicap override
// ──────────────────────────────────────────────

export const updateRoundParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundParticipantId: z.string().uuid(),
      handicapOverride: z.number().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const rp = await db.query.roundParticipants.findFirst({
      where: eq(roundParticipants.id, data.roundParticipantId),
      with: { round: true },
    });
    if (!rp) throw new Error('Participant not found');
    if (rp.round.status === 'finalized') {
      throw new Error('Cannot edit handicaps on finalized rounds');
    }

    await requireCommissioner(rp.round.tournamentId);

    await db
      .update(roundParticipants)
      .set({
        handicapOverride: data.handicapOverride?.toString() ?? null,
      })
      .where(eq(roundParticipants.id, data.roundParticipantId));

    return { success: true };
  });

// ──────────────────────────────────────────────────
// Create a single round (auto-creates tournament)
// ──────────────────────────────────────────────────

export const createSingleRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(createSingleRoundSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Ensure the user has a person record
    let person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });
    if (!person) {
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      });
      const displayName = profile?.displayName || profile?.email || 'Unknown';
      const [created] = await db
        .insert(persons)
        .values({
          displayName,
          userId: user.id,
          createdByUserId: user.id,
        })
        .returning();
      person = created;
    }

    // Look up the course name for the auto-generated tournament name
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
    });
    const courseName = course?.name ?? 'Round';
    const dateLabel = data.date
      ? new Date(data.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
    const tournamentName = `${courseName} – ${dateLabel}`;

    // 1. Create the auto-tournament
    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: tournamentName,
        isSingleRound: true,
        createdByUserId: user.id,
        inviteCode: generateInviteCode(),
      })
      .returning();

    // 2. Add creator as commissioner participant
    const [tp] = await db
      .insert(tournamentParticipants)
      .values({
        tournamentId: tournament.id,
        personId: person.id,
        role: 'commissioner',
      })
      .returning();

    // 3. Create the round
    const [round] = await db
      .insert(rounds)
      .values({
        tournamentId: tournament.id,
        courseId: data.courseId,
        roundNumber: 1,
        date: data.date ? new Date(data.date) : new Date(),
        teeTime: data.teeTime || null,
        createdByUserId: user.id,
      })
      .returning();

    // 4. Add creator as round participant
    await db.insert(roundParticipants).values({
      roundId: round.id,
      personId: person.id,
      tournamentParticipantId: tp.id,
      handicapSnapshot: person.currentHandicap ?? '0',
    });

    // 5. Don't create default group - groups are only needed for >4 players
    // Commissioners can create groups manually or use auto-assign when needed

    return {
      tournamentId: tournament.id,
      roundId: round.id,
    };
  });
