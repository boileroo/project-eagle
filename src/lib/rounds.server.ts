import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
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

    const [round] = await db
      .insert(rounds)
      .values({
        tournamentId: data.tournamentId,
        courseId: data.courseId,
        roundNumber: data.roundNumber ?? null,
        date: data.date ? new Date(data.date) : null,
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

    return { roundId: round.id };
  });

// ──────────────────────────────────────────────
// Update a round (course, number, date)
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
    if (data.roundNumber !== undefined)
      updates.roundNumber = data.roundNumber ?? null;
    if (data.date !== undefined)
      updates.date = data.date ? new Date(data.date) : null;

    await db.update(rounds).set(updates).where(eq(rounds.id, data.id));

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

    await db.delete(rounds).where(eq(rounds.id, data.roundId));

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
