import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  competitions,
  bonusAwards,
  rounds,
  tournamentTeams,
  roundGroups,
  roundParticipants,
} from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  requireCommissionerOrRoundMarker,
  requireTournamentParticipant,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { safeHandler } from './server/server-utils.server';
import {
  competitionConfigSchema,
  isBonusFormat,
  isTeamFormat,
  deriveGroupScope,
} from './competition-config';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  awardBonusSchema,
} from './validators';

export const getCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
    return db.query.competitions.findMany({
      where: eq(competitions.tournamentId, data.tournamentId),
      orderBy: (competitions, { asc }) => [asc(competitions.createdAt)],
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: { person: true },
            },
          },
        },
      },
    });
  });

export const getRoundCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);
    return db.query.competitions.findMany({
      where: eq(competitions.roundId, data.roundId),
      orderBy: (competitions, { asc }) => [asc(competitions.createdAt)],
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: { person: true },
            },
          },
        },
      },
    });
  });

export const getCompetitionFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: { person: true },
            },
          },
        },
      },
    });
    if (comp) {
      await verifyTournamentMembership(user.id, comp.tournamentId);
    }
    return comp;
  });

export const createCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator(createCompetitionSchema)
  .handler(
    safeHandler(async ({ data }) => {
      await requireCommissioner(data.tournamentId);

      const parsed = competitionConfigSchema.parse(data.competitionConfig);
      const category = data.competitionCategory;
      const groupScope = deriveGroupScope(category);

      const round = await db.query.rounds.findFirst({
        where: and(
          eq(rounds.id, data.roundId),
          eq(rounds.tournamentId, data.tournamentId),
        ),
      });
      if (!round) throw new Error('Round not found in this tournament');

      const teams = await db.query.tournamentTeams.findMany({
        where: eq(tournamentTeams.tournamentId, data.tournamentId),
      });
      const hasTeams = teams.length > 0;

      if (category === 'game' && hasTeams) {
        throw new Error(
          'Games are not available when teams are enabled. Use a team match instead.',
        );
      }

      if (category === 'match' && !hasTeams) {
        throw new Error(
          'Team matches require teams to be configured on the tournament.',
        );
      }

      if (category === 'game') {
        if (!data.roundGroupId) {
          throw new Error('A game must be linked to a specific group.');
        }
        const group = await db.query.roundGroups.findFirst({
          where: and(
            eq(roundGroups.id, data.roundGroupId),
            eq(roundGroups.roundId, data.roundId),
          ),
        });
        if (!group) throw new Error('Group not found in this round.');

        const existingGame = await db.query.competitions.findFirst({
          where: and(
            eq(competitions.roundGroupId, data.roundGroupId),
            eq(competitions.competitionCategory, 'game'),
          ),
        });
        if (existingGame) {
          throw new Error(
            'This group already has a game. Each group can have at most one game.',
          );
        }

        const groupParticipants = await db.query.roundParticipants.findMany({
          where: and(
            eq(roundParticipants.roundId, data.roundId),
            eq(roundParticipants.roundGroupId, data.roundGroupId),
          ),
        });
        const playerCount = groupParticipants.length;

        if (parsed.formatType === 'wolf' && playerCount !== 4) {
          throw new Error('Wolf requires exactly 4 players in the group.');
        }
        if (parsed.formatType === 'six_point' && playerCount !== 3) {
          throw new Error('Six Point requires exactly 3 players in the group.');
        }
        if (parsed.formatType === 'chair' && playerCount < 2) {
          throw new Error('Chair requires at least 2 players in the group.');
        }
      }

      if (category === 'match') {
        const existingTeamMatch = await db.query.competitions.findFirst({
          where: and(
            eq(competitions.roundId, data.roundId),
            eq(competitions.competitionCategory, 'match'),
          ),
        });
        if (existingTeamMatch) {
          throw new Error(
            'This round already has a team match. Only one team match is allowed per round.',
          );
        }

        if (
          isTeamFormat(parsed.formatType) ||
          parsed.formatType === 'match_play'
        ) {
          const groups = await db.query.roundGroups.findMany({
            where: eq(roundGroups.roundId, data.roundId),
            with: { participants: true },
          });

          if (
            parsed.formatType === 'best_ball' ||
            parsed.formatType === 'hi_lo'
          ) {
            for (const group of groups) {
              if (group.participants.length !== 4) {
                throw new Error(
                  `${parsed.formatType === 'best_ball' ? 'Best Ball' : 'Hi-Lo'} requires exactly 4 players per group. Group "${group.name ?? group.groupNumber}" has ${group.participants.length}.`,
                );
              }
            }
          }

          if (parsed.formatType === 'rumble') {
            for (const group of groups) {
              if (group.participants.length !== 4) {
                throw new Error(
                  `Rumble requires exactly 4 players per group. Group "${group.name ?? group.groupNumber}" has ${group.participants.length}.`,
                );
              }
            }
          }
        }
      }

      if (category === 'bonus' && !isBonusFormat(parsed.formatType)) {
        throw new Error(
          'Bonus competitions must use a bonus format (nearest_pin or longest_drive).',
        );
      }

      const roundGroupId =
        category === 'game' ? (data.roundGroupId ?? null) : null;

      const [comp] = await db
        .insert(competitions)
        .values({
          tournamentId: data.tournamentId,
          roundId: data.roundId,
          roundGroupId,
          name: data.name,
          competitionCategory: category,
          groupScope,
          formatType: parsed.formatType,
          configJson: parsed.config,
        })
        .returning();

      return comp;
    }),
  );

export const updateCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator(updateCompetitionSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const existing = await db.query.competitions.findFirst({
        where: eq(competitions.id, data.id),
      });
      if (!existing) throw new Error('Competition not found');

      await requireCommissioner(existing.tournamentId);

      const updates: Record<string, unknown> = {};
      if (data.name !== undefined) updates.name = data.name;

      updates.groupScope = deriveGroupScope(
        existing.competitionCategory as 'game' | 'match' | 'bonus',
      );

      if (data.competitionConfig !== undefined) {
        const parsed = competitionConfigSchema.parse(data.competitionConfig);
        updates.formatType = parsed.formatType;
        updates.configJson = parsed.config;
      }
      updates.updatedAt = new Date();

      const [updated] = await db
        .update(competitions)
        .set(updates)
        .where(eq(competitions.id, data.id))
        .returning();

      return updated;
    }),
  );

export const deleteCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(
    safeHandler(async ({ data }) => {
      const existing = await db.query.competitions.findFirst({
        where: eq(competitions.id, data.competitionId),
      });
      if (!existing) throw new Error('Competition not found');

      await requireCommissioner(existing.tournamentId);

      await db
        .delete(competitions)
        .where(eq(competitions.id, data.competitionId));
      return { success: true };
    }),
  );

export const awardBonusFn = createServerFn({ method: 'POST' })
  .inputValidator(awardBonusSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const comp = await db.query.competitions.findFirst({
        where: eq(competitions.id, data.competitionId),
      });
      if (!comp) throw new Error('Competition not found');
      if (
        comp.formatType !== 'nearest_pin' &&
        comp.formatType !== 'longest_drive'
      ) {
        throw new Error('Can only award bonuses for NTP/LD competitions');
      }

      const user = await requireCommissionerOrRoundMarker(
        comp.tournamentId,
        comp.roundId,
      );

      await db
        .delete(bonusAwards)
        .where(eq(bonusAwards.competitionId, data.competitionId));

      const [award] = await db
        .insert(bonusAwards)
        .values({
          competitionId: data.competitionId,
          roundParticipantId: data.roundParticipantId,
          awardedByUserId: user.id,
        })
        .returning();

      return award;
    }),
  );

export const removeBonusAwardFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(
    safeHandler(async ({ data }) => {
      const comp = await db.query.competitions.findFirst({
        where: eq(competitions.id, data.competitionId),
      });
      if (!comp) throw new Error('Competition not found');

      await requireCommissioner(comp.tournamentId);

      await db
        .delete(bonusAwards)
        .where(eq(bonusAwards.competitionId, data.competitionId));

      return { success: true };
    }),
  );
