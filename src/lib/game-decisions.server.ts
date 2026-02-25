import { createServerFn } from '@tanstack/react-start';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { gameDecisions, competitions } from '@/db/schema';
import {
  requireAuth,
  verifyTournamentMembership,
} from './server/auth.helpers.server';

export const submitGameDecisionFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      competitionId: z.string().uuid(),
      roundId: z.string().uuid(),
      holeNumber: z.number().int().min(1).max(18),
      wolfPlayerId: z.string().uuid(),
      partnerPlayerId: z.string().uuid().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
      columns: { tournamentId: true, formatType: true },
    });
    if (!comp) throw new Error('Competition not found');
    if (comp.formatType !== 'wolf')
      throw new Error(
        'Game decisions are only supported for Wolf competitions',
      );

    await verifyTournamentMembership(user.id, comp.tournamentId);

    const [decision] = await db
      .insert(gameDecisions)
      .values({
        competitionId: data.competitionId,
        roundId: data.roundId,
        holeNumber: data.holeNumber,
        data: {
          wolfPlayerId: data.wolfPlayerId,
          partnerPlayerId: data.partnerPlayerId,
        },
        recordedByUserId: user.id,
      })
      .returning();

    return decision;
  });

export const getGameDecisionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
      columns: { tournamentId: true },
    });
    if (!comp) throw new Error('Competition not found');
    await verifyTournamentMembership(user.id, comp.tournamentId);

    const allDecisions = await db.query.gameDecisions.findMany({
      where: eq(gameDecisions.competitionId, data.competitionId),
      orderBy: [desc(gameDecisions.createdAt)],
    });

    const seen = new Set<number>();
    const latest = allDecisions.filter((d) => {
      if (seen.has(d.holeNumber)) return false;
      seen.add(d.holeNumber);
      return true;
    });

    return latest;
  });
