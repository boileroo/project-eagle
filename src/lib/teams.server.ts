import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { teams, teamMembers, players, tournaments } from '@/db/schema';
import { requireCommissioner } from './server/auth.helpers.server';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from './validators';
import { requireTournamentSetup } from './server/tournament-status.server';

export const createTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(createTeamSchema)
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');
    await requireTournamentSetup(data.tournamentId);

    const [team] = await db
      .insert(teams)
      .values({
        tournamentId: data.tournamentId,
        name: data.name,
      })
      .returning();

    return { teamId: team.id };
  });

export const updateTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(updateTeamSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.id, data.teamId),
    });
    if (!existing) throw new Error('Team not found');

    await requireCommissioner(existing.tournamentId);
    await requireTournamentSetup(existing.tournamentId);

    await db
      .update(teams)
      .set({ name: data.name })
      .where(eq(teams.id, data.teamId));

    return { success: true };
  });

export const deleteTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ teamId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.teams.findFirst({
      where: eq(teams.id, data.teamId),
    });
    if (!existing) throw new Error('Team not found');

    await requireCommissioner(existing.tournamentId);
    await requireTournamentSetup(existing.tournamentId);

    await db.delete(teams).where(eq(teams.id, data.teamId));

    return { success: true };
  });

export const addTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(addTeamMemberSchema)
  .handler(async ({ data }) => {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, data.teamId),
    });
    if (!team) throw new Error('Team not found');

    await requireCommissioner(team.tournamentId);
    await requireTournamentSetup(team.tournamentId);

    const player = await db.query.players.findFirst({
      where: eq(players.id, data.playerId),
    });
    if (!player) throw new Error('Player not found');
    if (player.tournamentId !== team.tournamentId) {
      throw new Error('Player is not in this tournament');
    }

    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, data.teamId),
        eq(teamMembers.playerId, data.playerId),
      ),
    });
    if (existingMembership) throw new Error('Already a member of this team');

    return db.transaction(async (tx) => {
      const otherTeams = await tx.query.teams.findMany({
        where: and(eq(teams.tournamentId, team.tournamentId)),
      });
      const otherTeamIds = otherTeams.map((t) => t.id);
      for (const otherTeamId of otherTeamIds) {
        if (otherTeamId === data.teamId) continue;
        await tx
          .delete(teamMembers)
          .where(
            and(
              eq(teamMembers.teamId, otherTeamId),
              eq(teamMembers.playerId, data.playerId),
            ),
          );
      }

      const [member] = await tx
        .insert(teamMembers)
        .values({
          teamId: data.teamId,
          playerId: data.playerId,
        })
        .returning();

      return { memberId: member.id };
    });
  });

export const removeTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ memberId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, data.memberId),
    });
    if (!existing) throw new Error('Team member not found');

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, existing.teamId),
    });
    if (!team) throw new Error('Team not found');

    await requireCommissioner(team.tournamentId);
    await requireTournamentSetup(team.tournamentId);

    await db.delete(teamMembers).where(eq(teamMembers.id, data.memberId));

    return { success: true };
  });

export const moveTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      memberId: z.string().uuid(),
      targetTeamId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const existing = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, data.memberId),
    });
    if (!existing) throw new Error('Team member not found');

    const targetTeam = await db.query.teams.findFirst({
      where: eq(teams.id, data.targetTeamId),
    });
    if (!targetTeam) throw new Error('Target team not found');

    const sourceTeam = await db.query.teams.findFirst({
      where: eq(teams.id, existing.teamId),
    });
    if (!sourceTeam) throw new Error('Source team not found');

    if (sourceTeam.tournamentId !== targetTeam.tournamentId) {
      throw new Error('Teams must belong to the same tournament');
    }

    await requireCommissioner(targetTeam.tournamentId);
    await requireTournamentSetup(targetTeam.tournamentId);

    if (existing.teamId === data.targetTeamId) {
      return { success: true };
    }

    await db.transaction(async (tx) => {
      await tx.delete(teamMembers).where(eq(teamMembers.id, data.memberId));

      await tx.insert(teamMembers).values({
        teamId: data.targetTeamId,
        playerId: existing.playerId,
      });
    });

    return { success: true };
  });

export const deleteAllTeamsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);
    await requireTournamentSetup(data.tournamentId);

    await db.delete(teams).where(eq(teams.tournamentId, data.tournamentId));

    return { success: true };
  });
