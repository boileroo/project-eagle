import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { groups, roundPlayers, rounds } from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import {
  createGroupSchema,
  assignPlayerToGroupSchema,
  autoAssignGroupsSchema,
} from './validators';

export const getRoundGroupsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!round) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, round.tournamentId);

    return db.query.groups.findMany({
      where: eq(groups.roundId, data.roundId),
      orderBy: (g, { asc }) => [asc(g.groupNumber)],
      with: {
        players: {
          with: {
            person: true,
            player: true,
          },
        },
      },
    });
  });

export const createRoundGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(createGroupSchema)
  .handler(async ({ data }) => {
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!round) throw new Error('Round not found');
    if (round.status !== 'draft') {
      throw new Error('Can only create groups in draft rounds');
    }

    await requireCommissioner(round.tournamentId);

    const [group] = await db
      .insert(groups)
      .values({
        roundId: data.roundId,
        groupNumber: data.groupNumber,
        name: data.name ?? null,
      })
      .returning();

    return group;
  });

export const deleteRoundGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ groupId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, data.groupId),
      with: { round: true },
    });
    if (!group) throw new Error('Group not found');
    if (group.round.status !== 'draft') {
      throw new Error('Can only delete groups in draft rounds');
    }

    await requireCommissioner(group.round.tournamentId);

    await db.delete(groups).where(eq(groups.id, data.groupId));

    return { success: true };
  });

export const assignPlayerToGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(assignPlayerToGroupSchema)
  .handler(async ({ data }) => {
    const rp = await db.query.roundPlayers.findFirst({
      where: eq(roundPlayers.id, data.roundPlayerId),
      with: { round: true },
    });
    if (!rp) throw new Error('Round player not found');
    if (rp.round.status !== 'draft') {
      throw new Error('Can only reassign groups in draft rounds');
    }

    await requireCommissioner(rp.round.tournamentId);

    if (data.groupId) {
      const group = await db.query.groups.findFirst({
        where: and(eq(groups.id, data.groupId), eq(groups.roundId, rp.roundId)),
      });
      if (!group) throw new Error('Group not found in this round');
    }

    await db
      .update(roundPlayers)
      .set({ groupId: data.groupId })
      .where(eq(roundPlayers.id, data.roundPlayerId));

    return { success: true };
  });

export const autoAssignGroupsFn = createServerFn({ method: 'POST' })
  .inputValidator(autoAssignGroupsSchema)
  .handler(async ({ data }) => {
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!round) throw new Error('Round not found');
    if (round.status !== 'draft') {
      throw new Error('Can only auto-assign groups in draft rounds');
    }

    await requireCommissioner(round.tournamentId);

    const roundPlayersList = await db.query.roundPlayers.findMany({
      where: eq(roundPlayers.roundId, data.roundId),
      orderBy: (rp, { asc }) => [asc(rp.createdAt)],
    });

    if (roundPlayersList.length === 0) {
      throw new Error('No players in this round');
    }

    await db.delete(groups).where(eq(groups.roundId, data.roundId));

    const groupSize = data.groupSize ?? 4;
    const numGroups = Math.ceil(roundPlayersList.length / groupSize);

    const createdGroups = [];
    for (let i = 0; i < numGroups; i++) {
      const [group] = await db
        .insert(groups)
        .values({
          roundId: data.roundId,
          groupNumber: i + 1,
          name: `Group ${i + 1}`,
        })
        .returning();
      createdGroups.push(group);
    }

    for (let i = 0; i < roundPlayersList.length; i++) {
      const groupIdx = i % numGroups;
      await db
        .update(roundPlayers)
        .set({ groupId: createdGroups[groupIdx].id })
        .where(eq(roundPlayers.id, roundPlayersList[i].id));
    }

    return { groups: createdGroups };
  });

export interface DerivedMatchPairing {
  playerA: string; // roundPlayerId
  playerB: string; // roundPlayerId
}

export interface DerivedTeamPairing {
  teamA: string; // tournamentTeamId
  teamB: string; // tournamentTeamId
}

export const deriveGroupPairingsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      groupId: z.string().uuid(),
      format: z.enum(['match_play', 'best_ball']),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, data.groupId),
      with: {
        round: {
          columns: { tournamentId: true },
        },
        players: {
          with: {
            player: {
              with: {
                teamMemberships: true,
              },
            },
          },
        },
      },
    });
    if (!group) throw new Error('Group not found');
    await verifyTournamentMembership(user.id, group.round.tournamentId);

    const roundPlayersList = group.players;

    if (data.format === 'match_play') {
      const teamMap = new Map<string, string[]>();
      const unteamed: string[] = [];

      for (const rp of roundPlayersList) {
        const memberships = rp.player?.teamMemberships ?? [];
        if (memberships.length > 0) {
          const teamId = memberships[0].teamId;
          const list = teamMap.get(teamId) ?? [];
          list.push(rp.id);
          teamMap.set(teamId, list);
        } else {
          unteamed.push(rp.id);
        }
      }

      const matchPairings: DerivedMatchPairing[] = [];
      const teams = Array.from(teamMap.entries());

      if (teams.length >= 2) {
        const [, teamAPlayers] = teams[0];
        const [, teamBPlayers] = teams[1];
        const pairCount = Math.min(teamAPlayers.length, teamBPlayers.length);
        for (let i = 0; i < pairCount; i++) {
          matchPairings.push({
            playerA: teamAPlayers[i],
            playerB: teamBPlayers[i],
          });
        }
      } else {
        const all = [...roundPlayersList.map((p) => p.id)];
        for (let i = 0; i < all.length - 1; i += 2) {
          matchPairings.push({
            playerA: all[i],
            playerB: all[i + 1],
          });
        }
      }

      return { format: 'match_play' as const, pairings: matchPairings };
    }

    const teamMap2 = new Map<string, string[]>();

    for (const rp of roundPlayersList) {
      const memberships = rp.player?.teamMemberships ?? [];
      if (memberships.length > 0) {
        const teamId = memberships[0].teamId;
        const list = teamMap2.get(teamId) ?? [];
        list.push(rp.id);
        teamMap2.set(teamId, list);
      }
    }

    const teamIdList = Array.from(teamMap2.keys());
    const teamPairings: DerivedTeamPairing[] = [];
    for (let i = 0; i < teamIdList.length - 1; i += 2) {
      teamPairings.push({
        teamA: teamIdList[i],
        teamB: teamIdList[i + 1],
      });
    }

    return { format: 'best_ball' as const, pairings: teamPairings };
  });
