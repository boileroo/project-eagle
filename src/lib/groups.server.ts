import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  roundGroups,
  roundParticipants,
  rounds,
  roundTeamMembers,
} from '@/db/schema';
import { requireCommissioner } from './auth.helpers';
import {
  createRoundGroupSchema,
  assignParticipantToGroupSchema,
  autoAssignGroupsSchema,
} from './validators';

// ──────────────────────────────────────────────
// List groups for a round (with participants)
// ──────────────────────────────────────────────

export const getRoundGroupsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    return db.query.roundGroups.findMany({
      where: eq(roundGroups.roundId, data.roundId),
      orderBy: (g, { asc }) => [asc(g.groupNumber)],
      with: {
        participants: {
          with: {
            person: true,
            tournamentParticipant: true,
          },
        },
      },
    });
  });

// ──────────────────────────────────────────────
// Create a single group (commissioner only)
// ──────────────────────────────────────────────

export const createRoundGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(createRoundGroupSchema)
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
      .insert(roundGroups)
      .values({
        roundId: data.roundId,
        groupNumber: data.groupNumber,
        name: data.name ?? null,
      })
      .returning();

    return group;
  });

// ──────────────────────────────────────────────
// Delete a group (commissioner only)
// Participants in this group get their groupId set to null
// ──────────────────────────────────────────────

export const deleteRoundGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ roundGroupId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const group = await db.query.roundGroups.findFirst({
      where: eq(roundGroups.id, data.roundGroupId),
      with: { round: true },
    });
    if (!group) throw new Error('Group not found');
    if (group.round.status !== 'draft') {
      throw new Error('Can only delete groups in draft rounds');
    }

    await requireCommissioner(group.round.tournamentId);

    await db.delete(roundGroups).where(eq(roundGroups.id, data.roundGroupId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Assign a participant to a group
// ──────────────────────────────────────────────

export const assignParticipantToGroupFn = createServerFn({ method: 'POST' })
  .inputValidator(assignParticipantToGroupSchema)
  .handler(async ({ data }) => {
    const rp = await db.query.roundParticipants.findFirst({
      where: eq(roundParticipants.id, data.roundParticipantId),
      with: { round: true },
    });
    if (!rp) throw new Error('Participant not found');

    await requireCommissioner(rp.round.tournamentId);

    // Validate the group belongs to the same round
    if (data.roundGroupId) {
      const group = await db.query.roundGroups.findFirst({
        where: and(
          eq(roundGroups.id, data.roundGroupId),
          eq(roundGroups.roundId, rp.roundId),
        ),
      });
      if (!group) throw new Error('Group not found in this round');
    }

    await db
      .update(roundParticipants)
      .set({ roundGroupId: data.roundGroupId })
      .where(eq(roundParticipants.id, data.roundParticipantId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Auto-assign groups for a round
// Creates groups and distributes participants evenly.
// Clears existing groups first.
// ──────────────────────────────────────────────

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

    // Get all participants in this round
    const participants = await db.query.roundParticipants.findMany({
      where: eq(roundParticipants.roundId, data.roundId),
      orderBy: (rp, { asc }) => [asc(rp.createdAt)],
    });

    if (participants.length === 0) {
      throw new Error('No participants in this round');
    }

    // Delete existing groups (CASCADE will null out roundGroupId)
    await db.delete(roundGroups).where(eq(roundGroups.roundId, data.roundId));

    const groupSize = data.groupSize ?? 4;
    const numGroups = Math.ceil(participants.length / groupSize);

    // Create new groups
    const createdGroups = [];
    for (let i = 0; i < numGroups; i++) {
      const [group] = await db
        .insert(roundGroups)
        .values({
          roundId: data.roundId,
          groupNumber: i + 1,
          name: `Group ${i + 1}`,
        })
        .returning();
      createdGroups.push(group);
    }

    // Distribute participants across groups (round-robin for balance)
    for (let i = 0; i < participants.length; i++) {
      const groupIdx = i % numGroups;
      await db
        .update(roundParticipants)
        .set({ roundGroupId: createdGroups[groupIdx].id })
        .where(eq(roundParticipants.id, participants[i].id));
    }

    return { groups: createdGroups };
  });

// ──────────────────────────────────────────────
// Auto-derive match pairings from a group
//
// For match play (individual): pairs players from
// opposing teams within the group. Falls back to
// sequential pairing if no team structure.
//
// For best ball (team): pairs the two teams
// represented in the group.
// ──────────────────────────────────────────────

export interface DerivedMatchPairing {
  playerA: string; // roundParticipantId
  playerB: string; // roundParticipantId
}

export interface DerivedTeamPairing {
  teamA: string; // roundTeamId
  teamB: string; // roundTeamId
}

export const deriveGroupPairingsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({ roundGroupId: z.string().uuid(), format: z.enum(['match_play', 'best_ball']) }),
  )
  .handler(async ({ data }) => {
    const group = await db.query.roundGroups.findFirst({
      where: eq(roundGroups.id, data.roundGroupId),
      with: {
        participants: {
          with: {
            tournamentParticipant: {
              with: {
                teamMemberships: true,
              },
            },
          },
        },
      },
    });
    if (!group) throw new Error('Group not found');

    const participants = group.participants;

    if (data.format === 'match_play') {
      // Try to pair by opposing teams
      const teamMap = new Map<string, string[]>(); // teamId -> roundParticipantIds
      const unteamed: string[] = [];

      for (const p of participants) {
        const memberships = p.tournamentParticipant?.teamMemberships ?? [];
        if (memberships.length > 0) {
          const teamId = memberships[0].teamId;
          const list = teamMap.get(teamId) ?? [];
          list.push(p.id);
          teamMap.set(teamId, list);
        } else {
          unteamed.push(p.id);
        }
      }

      const matchPairings: DerivedMatchPairing[] = [];
      const teams = Array.from(teamMap.entries());

      if (teams.length >= 2) {
        // Cross-team pairing: zip players from the two largest teams
        const [, teamAPlayers] = teams[0];
        const [, teamBPlayers] = teams[1];
        const pairCount = Math.min(teamAPlayers.length, teamBPlayers.length);
        for (let i = 0; i < pairCount; i++) {
          matchPairings.push({
            playerA: teamAPlayers[i],
            playerB: teamBPlayers[i],
          });
        }
        // Remaining unmatched players from larger team or other teams
        // can be configured manually
      } else {
        // No teams — sequential pairing
        const all = [...participants.map((p) => p.id)];
        for (let i = 0; i < all.length - 1; i += 2) {
          matchPairings.push({
            playerA: all[i],
            playerB: all[i + 1],
          });
        }
      }

      return { format: 'match_play' as const, pairings: matchPairings };
    }

    // best_ball: pair teams
    // Find round teams that have members in this group
    const roundTeamIds = new Set<string>();
    for (const p of participants) {
      const teamMembers = await db.query.roundTeamMembers.findMany({
        where: eq(roundTeamMembers.roundParticipantId, p.id),
      });
      for (const tm of teamMembers) {
        roundTeamIds.add(tm.roundTeamId);
      }
    }

    const teamIdList = Array.from(roundTeamIds);
    const teamPairings: DerivedTeamPairing[] = [];
    for (let i = 0; i < teamIdList.length - 1; i += 2) {
      teamPairings.push({
        teamA: teamIdList[i],
        teamB: teamIdList[i + 1],
      });
    }

    return { format: 'best_ball' as const, pairings: teamPairings };
  });
