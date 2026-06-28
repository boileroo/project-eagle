import { createServerFn } from '@tanstack/react-start';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { decisions, games } from '@/db/schema';
import {
  requireAuth,
  verifyTournamentMembership,
} from './server/auth.helpers.server';

export const submitDecisionFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      gameId: z.string().uuid(),
      roundId: z.string().uuid(),
      groupId: z.string().uuid(),
      holeNumber: z.number().int().min(1).max(18),
      wolfPlayerId: z.string().uuid(),
      partnerPlayerId: z.string().uuid().nullable(),
      isBlindLoneWolf: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
      columns: { tournamentId: true, format: true },
    });
    if (!game) throw new Error('Game not found');
    if (game.format !== 'wolf') {
      throw new Error('Decisions are only supported for Wolf games');
    }

    await verifyTournamentMembership(user.id, game.tournamentId);

    const [decision] = await db
      .insert(decisions)
      .values({
        gameId: data.gameId,
        roundId: data.roundId,
        groupId: data.groupId,
        holeNumber: data.holeNumber,
        data: {
          wolfPlayerId: data.wolfPlayerId,
          partnerPlayerId: data.partnerPlayerId,
          isBlindLoneWolf: data.isBlindLoneWolf ?? false,
        },
        recordedByUserId: user.id,
      })
      .returning();

    return decision;
  });

export const getDecisionsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      gameId: z.string().uuid(),
      groupId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
      columns: { tournamentId: true },
    });
    if (!game) throw new Error('Game not found');
    await verifyTournamentMembership(user.id, game.tournamentId);

    const allDecisions = await db.query.decisions.findMany({
      where: and(
        eq(decisions.gameId, data.gameId),
        eq(decisions.groupId, data.groupId),
      ),
      orderBy: [desc(decisions.createdAt)],
    });

    const seen = new Set<number>();
    const latest = allDecisions.filter((d) => {
      if (seen.has(d.holeNumber)) return false;
      seen.add(d.holeNumber);
      return true;
    });

    return latest;
  });

export const getAllDecisionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ gameId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
      columns: { tournamentId: true },
    });
    if (!game) throw new Error('Game not found');
    await verifyTournamentMembership(user.id, game.tournamentId);

    const allDecisions = await db.query.decisions.findMany({
      where: eq(decisions.gameId, data.gameId),
      orderBy: [desc(decisions.createdAt)],
    });

    const seen = new Map<string | null, Set<number>>();
    const latest = allDecisions.filter((d) => {
      const groupId = d.groupId ?? null;
      if (!seen.has(groupId)) seen.set(groupId, new Set());
      const groupSeen = seen.get(groupId)!;
      if (groupSeen.has(d.holeNumber)) return false;
      groupSeen.add(d.holeNumber);
      return true;
    });

    return latest;
  });
