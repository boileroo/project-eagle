import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { and, eq, count, asc, lt } from 'drizzle-orm';
import { db } from '@/db';
import {
  rounds,
  roundParticipants,
  tournamentParticipants,
} from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import type { CreateRoundInput, UpdateRoundInput } from './validators';

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
// Get a single round with participants & course
// ──────────────────────────────────────────────

export const getRoundFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { roundId: string }) => data)
  .handler(async ({ data }) => {
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
        tournament: true,
        participants: {
          with: {
            person: true,
            tournamentParticipant: true,
          },
          orderBy: (rp, { asc }) => [asc(rp.createdAt)],
        },
      },
    });
    if (!round) throw new Error('Round not found');
    return round;
  });

// ──────────────────────────────────────────────
// Create a round (within a tournament)
// ──────────────────────────────────────────────

export const createRoundFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateRoundInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Auto-assign roundNumber as next in sequence
    const [{ value: existingCount }] = await db
      .select({ value: count() })
      .from(rounds)
      .where(eq(rounds.tournamentId, data.tournamentId));

    const [round] = await db
      .insert(rounds)
      .values({
        tournamentId: data.tournamentId,
        courseId: data.courseId,
        roundNumber: existingCount + 1,
        date: data.date ? new Date(data.date) : null,
        teeTime: data.teeTime || null,
        createdByUserId: user.id,
      })
      .returning();

    // Auto-add all tournament participants as round participants
    const tpList = await db.query.tournamentParticipants.findMany({
      where: eq(
        tournamentParticipants.tournamentId,
        data.tournamentId,
      ),
      with: {
        person: true,
      },
    });

    if (tpList.length > 0) {
      await db.insert(roundParticipants).values(
        tpList.map((tp) => ({
          roundId: round.id,
          personId: tp.personId,
          tournamentParticipantId: tp.id,
          handicapSnapshot:
            tp.handicapOverride ??
            tp.person.currentHandicap ??
            '0',
        })),
      );
    }

    // Re-sort if dates are present
    await resortRoundsByDate(data.tournamentId);

    return { roundId: round.id };
  });

// ──────────────────────────────────────────────
// Update a round (course, date, tee time)
// ──────────────────────────────────────────────

export const updateRoundFn = createServerFn({ method: 'POST' })
  .inputValidator((data: UpdateRoundInput) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.id),
    });
    if (!existing) throw new Error('Round not found');
    if (existing.status !== 'draft') {
      throw new Error('Can only edit rounds in draft status');
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.courseId !== undefined) updates.courseId = data.courseId;
    if (data.date !== undefined)
      updates.date = data.date ? new Date(data.date) : null;
    if (data.teeTime !== undefined)
      updates.teeTime = data.teeTime || null;

    await db.update(rounds).set(updates).where(eq(rounds.id, data.id));

    // Re-sort if dates changed
    if (data.date !== undefined || data.teeTime !== undefined) {
      if (existing.tournamentId) {
        await resortRoundsByDate(existing.tournamentId);
      }
    }

    return { roundId: data.id };
  });

// ──────────────────────────────────────────────
// Delete a round
// ──────────────────────────────────────────────

export const deleteRoundFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { roundId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!existing) throw new Error('Round not found');
    if (existing.status !== 'draft') {
      throw new Error('Can only delete rounds in draft status');
    }

    await db.delete(rounds).where(eq(rounds.id, data.roundId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Reorder rounds (swap two round numbers)
// ──────────────────────────────────────────────

export const reorderRoundsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { tournamentId: string; roundIds: string[] }) => data,
  )
  .handler(async ({ data }) => {
    await requireAuth();

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
  draft: ['open'],
  open: ['locked', 'draft'],
  locked: ['finalized', 'open'],
  finalized: ['locked'], // allow unlock for corrections
};

export const transitionRoundFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { roundId: string; newStatus: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!existing) throw new Error('Round not found');

    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(data.newStatus)) {
      throw new Error(
        `Cannot transition from "${existing.status}" to "${data.newStatus}"`,
      );
    }

    // Sequential guards: check earlier rounds in the same tournament
    if (existing.tournamentId && existing.roundNumber) {
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
        status: data.newStatus as 'draft' | 'open' | 'locked' | 'finalized',
        updatedAt: new Date(),
      })
      .where(eq(rounds.id, data.roundId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Add a participant to a round
// ──────────────────────────────────────────────

export const addRoundParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      roundId: string;
      personId: string;
      tournamentParticipantId?: string;
      handicapSnapshot: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAuth();

    // Only allow adding participants in draft or open status
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!round) throw new Error('Round not found');
    if (round.status !== 'draft' && round.status !== 'open') {
      throw new Error('Can only add participants to draft or open rounds');
    }

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

    return { roundParticipantId: rp.id };
  });

// ──────────────────────────────────────────────
// Remove a participant from a round
// ──────────────────────────────────────────────

export const removeRoundParticipantFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { roundParticipantId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    // Only allow removal in draft or open status
    const rp = await db.query.roundParticipants.findFirst({
      where: eq(roundParticipants.id, data.roundParticipantId),
      with: { round: true },
    });
    if (!rp) throw new Error('Participant not found');
    if (rp.round.status !== 'draft' && rp.round.status !== 'open') {
      throw new Error('Can only remove participants from draft or open rounds');
    }

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
    (data: { roundParticipantId: string; handicapOverride: number | null }) =>
      data,
  )
  .handler(async ({ data }) => {
    await requireAuth();

    await db
      .update(roundParticipants)
      .set({
        handicapOverride: data.handicapOverride?.toString() ?? null,
      })
      .where(eq(roundParticipants.id, data.roundParticipantId));

    return { success: true };
  });
