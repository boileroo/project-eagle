import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  scoreEvents,
  rounds,
  roundParticipants,
  persons,
  tournamentParticipants,
} from '@/db/schema';
import {
  requireAuth,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { submitScoreSchema } from './validators';
import { safeHandler } from './server/server-utils.server';

// ──────────────────────────────────────────────
// Shared: resolve latest score per (participant, hole)
// ──────────────────────────────────────────────

/**
 * Given a list of score events ordered by createdAt DESC,
 * returns only the latest event per (roundParticipantId, holeNumber).
 */
export function resolveLatestScores<
  T extends { roundParticipantId: string; holeNumber: number },
>(events: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const event of events) {
    const key = `${event.roundParticipantId}:${event.holeNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

// ──────────────────────────────────────────────
// Submit a score event (append-only)
// ──────────────────────────────────────────────

export const submitScoreFn = createServerFn({ method: 'POST' })
  .inputValidator(submitScoreSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      // Validate round exists and is in appropriate status
      const round = await db.query.rounds.findFirst({
        where: eq(rounds.id, data.roundId),
      });
      if (!round) throw new Error('Round not found');

      if (round.status !== 'open') {
        throw new Error('Round must be open to enter scores');
      }

      // Validate participant belongs to this round
      const rp = await db.query.roundParticipants.findFirst({
        where: and(
          eq(roundParticipants.id, data.roundParticipantId),
          eq(roundParticipants.roundId, data.roundId),
        ),
      });
      if (!rp) throw new Error('Participant not in this round');

      // Verify recordedByRole server-side
      let verifiedRole = data.recordedByRole;

      if (data.recordedByRole === 'player') {
        // 'player' → the authenticated user must own this participant's person
        const person = await db.query.persons.findFirst({
          where: eq(persons.id, rp.personId),
        });
        if (!person || person.userId !== user.id) {
          throw new Error('You can only record your own scores as a player');
        }
      } else {
        // 'marker' or 'commissioner' → user must actually hold that role
        // (or a higher role) in the tournament
        const userPerson = await db.query.persons.findFirst({
          where: eq(persons.userId, user.id),
        });
        if (!userPerson) {
          throw new Error('You are not a participant in this tournament');
        }

        const tp = await db.query.tournamentParticipants.findFirst({
          where: and(
            eq(tournamentParticipants.tournamentId, round.tournamentId),
            eq(tournamentParticipants.personId, userPerson.id),
          ),
        });
        if (!tp) {
          throw new Error('You are not a participant in this tournament');
        }

        if (data.recordedByRole === 'commissioner') {
          if (tp.role !== 'commissioner') {
            throw new Error(
              'Only commissioners can record scores as commissioner',
            );
          }
        } else {
          // marker claim — must be marker or commissioner
          if (tp.role !== 'marker' && tp.role !== 'commissioner') {
            throw new Error(
              'Only markers and commissioners can record scores for other players',
            );
          }
          // Use their actual tournament role
          verifiedRole = tp.role === 'commissioner' ? 'commissioner' : 'marker';
        }
      }

      // Append the score event (immutable, latest wins)
      const [event] = await db
        .insert(scoreEvents)
        .values({
          roundId: data.roundId,
          roundParticipantId: data.roundParticipantId,
          holeNumber: data.holeNumber,
          strokes: data.strokes,
          recordedByUserId: user.id,
          recordedByRole: verifiedRole,
        })
        .returning();

      return event;
    }),
  );

// ──────────────────────────────────────────────
// Get resolved scorecard (latest event wins)
// Returns: Record<roundParticipantId, Record<holeNumber, { strokes, recordedByRole }>>
// ──────────────────────────────────────────────

export const getScorecardFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // IDOR: verify the requesting user is a participant in this round's tournament
    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);

    // Fetch all events ordered by createdAt DESC so first-seen = latest
    const events = await db.query.scoreEvents.findMany({
      where: eq(scoreEvents.roundId, data.roundId),
      orderBy: [desc(scoreEvents.createdAt)],
    });

    // Count all events per cell first
    const eventCounts = new Map<string, number>();
    for (const event of events) {
      const key = `${event.roundParticipantId}:${event.holeNumber}`;
      eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
    }

    // Resolve: latest event per (roundParticipantId, holeNumber)
    const scorecard: Record<
      string,
      Record<
        number,
        { strokes: number; recordedByRole: string; eventCount: number }
      >
    > = {};

    for (const event of resolveLatestScores(events)) {
      const key = `${event.roundParticipantId}:${event.holeNumber}`;
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
// Bulk submit scores (dev tools — fill entire scorecard)
// ──────────────────────────────────────────────

export const bulkSubmitScoresFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      roundParticipantId: z.string().uuid(),
      scores: z.array(
        z.object({
          holeNumber: z.number().int().min(1).max(18),
          strokes: z.number().int().min(1).max(20),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Validate round exists and is open
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!round) throw new Error('Round not found');
    if (round.status !== 'open') {
      throw new Error('Round must be open to enter scores');
    }

    // Validate participant belongs to this round
    const rp = await db.query.roundParticipants.findFirst({
      where: and(
        eq(roundParticipants.id, data.roundParticipantId),
        eq(roundParticipants.roundId, data.roundId),
      ),
    });
    if (!rp) throw new Error('Participant not in this round');

    // Verify the user is a commissioner in the tournament
    const userPerson = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });
    if (!userPerson) {
      throw new Error('You are not a participant in this tournament');
    }

    const tp = await db.query.tournamentParticipants.findFirst({
      where: and(
        eq(tournamentParticipants.tournamentId, round.tournamentId),
        eq(tournamentParticipants.personId, userPerson.id),
      ),
    });
    if (!tp || tp.role !== 'commissioner') {
      throw new Error('Only commissioners can bulk-submit scores');
    }

    // Insert all score events in one batch
    const values = data.scores.map((s) => ({
      roundId: data.roundId,
      roundParticipantId: data.roundParticipantId,
      holeNumber: s.holeNumber,
      strokes: s.strokes,
      recordedByUserId: user.id,
      recordedByRole: 'commissioner' as const,
    }));

    const events = await db.insert(scoreEvents).values(values).returning();
    return events;
  });

// ──────────────────────────────────────────────
// Get score history (audit trail) for a participant on a hole
// ──────────────────────────────────────────────

export const getScoreHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      roundParticipantId: z.string().uuid(),
      holeNumber: z.number().int().min(1).max(18),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // IDOR: verify the requesting user is a participant in this round's tournament
    const rpForAuth = await db.query.roundParticipants.findFirst({
      where: eq(roundParticipants.id, data.roundParticipantId),
      columns: { roundId: true },
    });
    if (!rpForAuth) throw new Error('Not found');
    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, rpForAuth.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);
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
