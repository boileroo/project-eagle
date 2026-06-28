import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  scores,
  rounds,
  roundPlayers,
  persons,
  players,
  tournaments,
} from '@/db/schema';
import {
  requireAuth,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { resolveLatestScores } from './server/score-events.server';
import { submitScoreSchema } from './validators';
import { safeHandler } from './server/server-utils.server';

export const submitScoreFn = createServerFn({ method: 'POST' })
  .inputValidator(submitScoreSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      const round = await db.query.rounds.findFirst({
        where: eq(rounds.id, data.roundId),
      });
      if (!round) throw new Error('Round not found');

      if (round.status !== 'open') {
        throw new Error('Round must be open to enter scores');
      }

      const rp = await db.query.roundPlayers.findFirst({
        where: and(
          eq(roundPlayers.id, data.roundPlayerId),
          eq(roundPlayers.roundId, data.roundId),
        ),
      });
      if (!rp) throw new Error('Participant not in this round');

      let verifiedRole = data.recordedByRole;

      if (data.recordedByRole === 'player') {
        const person = await db.query.persons.findFirst({
          where: eq(persons.id, rp.personId),
        });
        if (!person || person.userId !== user.id) {
          throw new Error('You can only record your own scores as a player');
        }
      } else {
        const userPerson = await db.query.persons.findFirst({
          where: eq(persons.userId, user.id),
          columns: { id: true },
        });
        if (!userPerson) {
          throw new Error('You are not a participant in this tournament');
        }

        const tournament = await db.query.tournaments.findFirst({
          where: eq(tournaments.id, round.tournamentId),
          columns: { createdByUserId: true },
        });
        const isCreator = tournament?.createdByUserId === user.id;

        const tp = await db.query.players.findFirst({
          where: and(
            eq(players.tournamentId, round.tournamentId),
            eq(players.personId, userPerson.id),
          ),
          columns: { role: true },
        });

        const isCommissioner = isCreator || tp?.role === 'commissioner';

        if (data.recordedByRole === 'commissioner') {
          if (!isCommissioner) {
            throw new Error(
              'Only commissioners can record scores as commissioner',
            );
          }
        } else {
          if (isCommissioner) {
            verifiedRole = 'commissioner';
          } else {
            const myRp = await db.query.roundPlayers.findFirst({
              where: and(
                eq(roundPlayers.roundId, data.roundId),
                eq(roundPlayers.personId, userPerson.id),
              ),
              columns: { isMarker: true, groupId: true },
            });

            if (!myRp?.isMarker) {
              throw new Error(
                'Only markers and commissioners can record scores for other players',
              );
            }

            if (myRp.groupId !== null) {
              if (rp.groupId !== myRp.groupId) {
                throw new Error(
                  'Markers can only record scores for players in their own group',
                );
              }
            }

            verifiedRole = 'marker';
          }
        }
      }

      const [event] = await db
        .insert(scores)
        .values({
          roundId: data.roundId,
          roundPlayerId: data.roundPlayerId,
          holeNumber: data.holeNumber,
          strokes: data.strokes,
          recordedByUserId: user.id,
          recordedByRole: verifiedRole,
        })
        .returning();

      return event;
    }),
  );

export const getScorecardFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);

    const events = await db.query.scores.findMany({
      where: eq(scores.roundId, data.roundId),
      orderBy: [desc(scores.createdAt)],
    });

    const eventCounts = new Map<string, number>();
    for (const event of events) {
      const key = `${event.roundPlayerId}:${event.holeNumber}`;
      eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
    }

    const scorecard: Record<
      string,
      Record<
        number,
        { strokes: number; recordedByRole: string; eventCount: number }
      >
    > = {};

    for (const event of resolveLatestScores(events)) {
      const key = `${event.roundPlayerId}:${event.holeNumber}`;
      if (!scorecard[event.roundPlayerId]) {
        scorecard[event.roundPlayerId] = {};
      }
      scorecard[event.roundPlayerId][event.holeNumber] = {
        strokes: event.strokes,
        recordedByRole: event.recordedByRole,
        eventCount: eventCounts.get(key) ?? 1,
      };
    }

    return scorecard;
  });

export const bulkSubmitScoresFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      roundPlayerId: z.string().uuid(),
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

    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!round) throw new Error('Round not found');
    if (round.status !== 'open') {
      throw new Error('Round must be open to enter scores');
    }

    const rp = await db.query.roundPlayers.findFirst({
      where: and(
        eq(roundPlayers.id, data.roundPlayerId),
        eq(roundPlayers.roundId, data.roundId),
      ),
    });
    if (!rp) throw new Error('Participant not in this round');

    const userPerson = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });
    if (!userPerson) {
      throw new Error('You are not a participant in this tournament');
    }

    const tp = await db.query.players.findFirst({
      where: and(
        eq(players.tournamentId, round.tournamentId),
        eq(players.personId, userPerson.id),
      ),
    });
    if (!tp || tp.role !== 'commissioner') {
      throw new Error('Only commissioners can bulk-submit scores');
    }

    const values = data.scores.map((s) => ({
      roundId: data.roundId,
      roundPlayerId: data.roundPlayerId,
      holeNumber: s.holeNumber,
      strokes: s.strokes,
      recordedByUserId: user.id,
      recordedByRole: 'commissioner' as const,
    }));

    const events = await db.insert(scores).values(values).returning();
    return events;
  });

export const getScoreHistoryFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      roundPlayerId: z.string().uuid(),
      holeNumber: z.number().int().min(1).max(18),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const rpForAuth = await db.query.roundPlayers.findFirst({
      where: eq(roundPlayers.id, data.roundPlayerId),
      columns: { roundId: true },
    });
    if (!rpForAuth) throw new Error('Not found');
    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, rpForAuth.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);

    const events = await db.query.scores.findMany({
      where: and(
        eq(scores.roundPlayerId, data.roundPlayerId),
        eq(scores.holeNumber, data.holeNumber),
      ),
      with: {
        recordedBy: true,
      },
      orderBy: [desc(scores.createdAt)],
    });

    return events.map((e) => ({
      id: e.id,
      strokes: e.strokes,
      recordedByRole: e.recordedByRole,
      recordedByName: e.recordedBy?.displayName ?? 'Unknown',
      createdAt: e.createdAt,
    }));
  });
