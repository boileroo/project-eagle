import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { games, sideGames, rounds, groups, roundPlayers } from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  requireCommissionerOrRoundMarker,
  requireTournamentParticipant,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { safeHandler } from './server/server-utils.server';
import { gameConfigSchema, isBonusFormat } from './game-config';
import {
  createGameSchema,
  updateGameSchema,
  awardSideGameSchema,
  createSideGameSchema,
} from './validators';

export const getGamesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
    return db.query.games.findMany({
      where: eq(games.tournamentId, data.tournamentId),
      orderBy: (games, { asc }) => [asc(games.createdAt)],
    });
  });

export const getRoundGamesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!round) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, round.tournamentId);
    return db.query.games.findMany({
      where: eq(games.roundId, data.roundId),
      orderBy: (games, { asc }) => [asc(games.createdAt)],
    });
  });

export const getGameFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ gameId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const game = await db.query.games.findFirst({
      where: eq(games.id, data.gameId),
    });
    if (game) await verifyTournamentMembership(user.id, game.tournamentId);
    return game;
  });

export const createGameFn = createServerFn({ method: 'POST' })
  .inputValidator(createGameSchema)
  .handler(
    safeHandler(async ({ data }) => {
      await requireCommissioner(data.tournamentId);

      const parsed = gameConfigSchema.parse(data.gameConfig);

      if (isBonusFormat(parsed.formatType)) {
        throw new Error(
          'NTP and LD are side games — use createSideGameFn instead.',
        );
      }

      const round = await db.query.rounds.findFirst({
        where: and(
          eq(rounds.id, data.roundId),
          eq(rounds.tournamentId, data.tournamentId),
        ),
      });
      if (!round) throw new Error('Round not found in this tournament');

      const group = await db.query.groups.findFirst({
        where: and(
          eq(groups.id, data.groupId),
          eq(groups.roundId, data.roundId),
        ),
      });
      if (!group) throw new Error('Group not found in this round');

      const existingGame = await db.query.games.findFirst({
        where: eq(games.groupId, data.groupId),
      });
      if (existingGame) {
        throw new Error(
          'This group already has a game. Each group can have at most one game.',
        );
      }

      const groupPlayers = await db.query.roundPlayers.findMany({
        where: and(
          eq(roundPlayers.roundId, data.roundId),
          eq(roundPlayers.groupId, data.groupId),
        ),
      });
      const playerCount = groupPlayers.length;

      if (parsed.formatType === 'wolf' && playerCount !== 4) {
        throw new Error('Wolf requires exactly 4 players in the group.');
      }
      if (parsed.formatType === 'six_point' && playerCount !== 3) {
        throw new Error('Six Point requires exactly 3 players in the group.');
      }
      if (parsed.formatType === 'chair' && playerCount < 2) {
        throw new Error('Chair requires at least 2 players in the group.');
      }

      const [game] = await db
        .insert(games)
        .values({
          tournamentId: data.tournamentId,
          roundId: data.roundId,
          groupId: data.groupId,
          name: data.name,
          format: parsed.formatType,
          config: parsed.config,
        })
        .returning();

      return game;
    }),
  );

export const updateGameFn = createServerFn({ method: 'POST' })
  .inputValidator(updateGameSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const existing = await db.query.games.findFirst({
        where: eq(games.id, data.id),
      });
      if (!existing) throw new Error('Game not found');

      await requireCommissioner(existing.tournamentId);

      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.gameConfig !== undefined) {
        const parsed = gameConfigSchema.parse(data.gameConfig);
        updates.format = parsed.formatType;
        updates.config = parsed.config;
      }
      updates.updatedAt = new Date();

      const [updated] = await db
        .update(games)
        .set(updates)
        .where(eq(games.id, data.id))
        .returning();

      return updated;
    }),
  );

export const deleteGameFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ gameId: z.string().uuid() }))
  .handler(
    safeHandler(async ({ data }) => {
      const existing = await db.query.games.findFirst({
        where: eq(games.id, data.gameId),
      });
      if (!existing) throw new Error('Game not found');

      await requireCommissioner(existing.tournamentId);

      await db.delete(games).where(eq(games.id, data.gameId));
      return { success: true };
    }),
  );

export const getSideGamesFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!round) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, round.tournamentId);
    return db.query.sideGames.findMany({
      where: eq(sideGames.roundId, data.roundId),
      with: {
        winner: { with: { person: true } },
      },
    });
  });

export const createSideGameFn = createServerFn({ method: 'POST' })
  .inputValidator(createSideGameSchema)
  .handler(
    safeHandler(async ({ data }) => {
      await requireCommissioner(data.tournamentId);

      const round = await db.query.rounds.findFirst({
        where: and(
          eq(rounds.id, data.roundId),
          eq(rounds.tournamentId, data.tournamentId),
        ),
      });
      if (!round) throw new Error('Round not found in this tournament');

      const [sideGame] = await db
        .insert(sideGames)
        .values({
          tournamentId: data.tournamentId,
          roundId: data.roundId,
          name: data.name,
          format: data.format,
          holeNumber: data.holeNumber ?? null,
          bonusMode: data.bonusMode ?? null,
          bonusPoints: data.bonusPoints ?? null,
        })
        .returning();

      return sideGame;
    }),
  );

export const awardSideGameFn = createServerFn({ method: 'POST' })
  .inputValidator(awardSideGameSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const sideGame = await db.query.sideGames.findFirst({
        where: eq(sideGames.id, data.sideGameId),
      });
      if (!sideGame) throw new Error('Side game not found');

      const user = await requireCommissionerOrRoundMarker(
        sideGame.tournamentId,
        sideGame.roundId,
      );

      const [updated] = await db
        .update(sideGames)
        .set({
          winnerId: data.roundPlayerId,
          awardedByUserId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(sideGames.id, data.sideGameId))
        .returning();

      return updated;
    }),
  );

export const removeSideGameAwardFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ sideGameId: z.string().uuid() }))
  .handler(
    safeHandler(async ({ data }) => {
      const sideGame = await db.query.sideGames.findFirst({
        where: eq(sideGames.id, data.sideGameId),
      });
      if (!sideGame) throw new Error('Side game not found');

      await requireCommissioner(sideGame.tournamentId);

      const [updated] = await db
        .update(sideGames)
        .set({ winnerId: null, awardedByUserId: null, updatedAt: new Date() })
        .where(eq(sideGames.id, data.sideGameId))
        .returning();

      return updated;
    }),
  );

export const deleteSideGameFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ sideGameId: z.string().uuid() }))
  .handler(
    safeHandler(async ({ data }) => {
      const sideGame = await db.query.sideGames.findFirst({
        where: eq(sideGames.id, data.sideGameId),
      });
      if (!sideGame) throw new Error('Side game not found');

      await requireCommissioner(sideGame.tournamentId);

      await db.delete(sideGames).where(eq(sideGames.id, data.sideGameId));
      return { success: true };
    }),
  );
