import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { scoreEvents, rounds, roundParticipants } from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import type { SubmitScoreInput } from './validators';

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
// Submit a score event (append-only)
// ──────────────────────────────────────────────

export const submitScoreFn = createServerFn({ method: 'POST' })
  .inputValidator((data: SubmitScoreInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Validate round exists and is in appropriate status
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!round) throw new Error('Round not found');

    if (round.status === 'draft') {
      throw new Error('Cannot enter scores for a draft round');
    }
    if (round.status === 'finalized') {
      throw new Error('Cannot enter scores for a finalized round');
    }
    // Locked rounds only accept commissioner entries
    if (round.status === 'locked' && data.recordedByRole !== 'commissioner') {
      throw new Error('Only commissioners can enter scores for a locked round');
    }

    // Validate participant belongs to this round
    const rp = await db.query.roundParticipants.findFirst({
      where: and(
        eq(roundParticipants.id, data.roundParticipantId),
        eq(roundParticipants.roundId, data.roundId),
      ),
    });
    if (!rp) throw new Error('Participant not in this round');

    // Append the score event (immutable, latest wins)
    const [event] = await db
      .insert(scoreEvents)
      .values({
        roundId: data.roundId,
        roundParticipantId: data.roundParticipantId,
        holeNumber: data.holeNumber,
        strokes: data.strokes,
        recordedByUserId: user.id,
        recordedByRole: data.recordedByRole,
      })
      .returning();

    return event;
  });

// ──────────────────────────────────────────────
// Get resolved scorecard (latest event wins)
// Returns: Record<roundParticipantId, Record<holeNumber, { strokes, recordedByRole }>>
// ──────────────────────────────────────────────

export const getScorecardFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { roundId: string }) => data)
  .handler(async ({ data }) => {
    // Fetch all events ordered by createdAt DESC so first-seen = latest
    const events = await db.query.scoreEvents.findMany({
      where: eq(scoreEvents.roundId, data.roundId),
      orderBy: [desc(scoreEvents.createdAt)],
    });

    // Resolve: latest event per (roundParticipantId, holeNumber)
    const scorecard: Record<
      string,
      Record<number, { strokes: number; recordedByRole: string; eventCount: number }>
    > = {};

    // Count all events per cell first
    const eventCounts = new Map<string, number>();
    for (const event of events) {
      const key = `${event.roundParticipantId}:${event.holeNumber}`;
      eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
    }

    // Take only the latest (first in DESC order)
    const seen = new Set<string>();
    for (const event of events) {
      const key = `${event.roundParticipantId}:${event.holeNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!scorecard[event.roundParticipantId]) {
        scorecard[event.roundParticipantId] = {};
      }
      scorecard[event.roundParticipantId][event.holeNumber] = {
        strokes: event.strokes,
        recordedByRole: event.recordedByRole,
        eventCount: eventCounts.get(key) ?? 1,
      };
    }

    return scorecard;
  });

// ──────────────────────────────────────────────
// Get score history (audit trail) for a participant on a hole
// ──────────────────────────────────────────────

export const getScoreHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      roundParticipantId: string;
      holeNumber: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    const events = await db.query.scoreEvents.findMany({
      where: and(
        eq(scoreEvents.roundParticipantId, data.roundParticipantId),
        eq(scoreEvents.holeNumber, data.holeNumber),
      ),
      with: {
        recordedBy: true,
      },
      orderBy: [desc(scoreEvents.createdAt)],
    });

    return events.map((e) => ({
      id: e.id,
      strokes: e.strokes,
      recordedByRole: e.recordedByRole,
      recordedByName: e.recordedBy?.displayName ?? 'Unknown',
      createdAt: e.createdAt,
    }));
  });
