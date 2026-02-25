import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  tournamentTeams,
  tournamentTeamMembers,
  tournamentParticipants,
  tournaments,
} from '@/db/schema';
import { requireCommissioner } from './server/auth.helpers.server';
import {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
} from './validators';
import { requireTournamentSetup } from './server/tournament-status.server';

// ──────────────────────────────────────────────
// Create a team
// ──────────────────────────────────────────────

export const createTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(createTeamSchema)
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    // Verify tournament exists and is in setup
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');
    await requireTournamentSetup(data.tournamentId);

    const [team] = await db
      .insert(tournamentTeams)
      .values({
        tournamentId: data.tournamentId,
        name: data.name,
      })
      .returning();

    return { teamId: team.id };
  });

// ──────────────────────────────────────────────
// Update a team (rename)
// ──────────────────────────────────────────────

export const updateTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(updateTeamSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, data.teamId),
    });
    if (!existing) throw new Error('Team not found');

    await requireCommissioner(existing.tournamentId);
    await requireTournamentSetup(existing.tournamentId);

    await db
      .update(tournamentTeams)
      .set({ name: data.name })
      .where(eq(tournamentTeams.id, data.teamId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Delete a team
// ──────────────────────────────────────────────

export const deleteTeamFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ teamId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, data.teamId),
    });
    if (!existing) throw new Error('Team not found');

    await requireCommissioner(existing.tournamentId);
    await requireTournamentSetup(existing.tournamentId);

    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, data.teamId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Add a member to a team
// ──────────────────────────────────────────────

export const addTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(addTeamMemberSchema)
  .handler(async ({ data }) => {
    // Verify team exists
    const team = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, data.teamId),
    });
    if (!team) throw new Error('Team not found');

    await requireCommissioner(team.tournamentId);
    await requireTournamentSetup(team.tournamentId);

    // Verify participant exists and belongs to the same tournament
    const participant = await db.query.tournamentParticipants.findFirst({
      where: eq(tournamentParticipants.id, data.participantId),
    });
    if (!participant) throw new Error('Participant not found');
    if (participant.tournamentId !== team.tournamentId) {
      throw new Error('Participant is not in this tournament');
    }

    // Check not already in this team
    const existingMembership = await db.query.tournamentTeamMembers.findFirst({
      where: and(
        eq(tournamentTeamMembers.teamId, data.teamId),
        eq(tournamentTeamMembers.participantId, data.participantId),
      ),
    });
    if (existingMembership) throw new Error('Already a member of this team');

    return db.transaction(async (tx) => {
      // Remove from any other team in the same tournament first
      const otherTeams = await tx.query.tournamentTeams.findMany({
        where: and(eq(tournamentTeams.tournamentId, team.tournamentId)),
      });
      const otherTeamIds = otherTeams.map((t) => t.id);
      for (const otherTeamId of otherTeamIds) {
        if (otherTeamId === data.teamId) continue;
        await tx
          .delete(tournamentTeamMembers)
          .where(
            and(
              eq(tournamentTeamMembers.teamId, otherTeamId),
              eq(tournamentTeamMembers.participantId, data.participantId),
            ),
          );
      }

      const [member] = await tx
        .insert(tournamentTeamMembers)
        .values({
          teamId: data.teamId,
          participantId: data.participantId,
        })
        .returning();

      return { memberId: member.id };
    });
  });

// ──────────────────────────────────────────────
// Remove a member from a team
// ──────────────────────────────────────────────

export const removeTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ memberId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentTeamMembers.findFirst({
      where: eq(tournamentTeamMembers.id, data.memberId),
    });
    if (!existing) throw new Error('Team member not found');

    // Look up team to get tournamentId
    const team = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, existing.teamId),
    });
    if (!team) throw new Error('Team not found');

    await requireCommissioner(team.tournamentId);
    await requireTournamentSetup(team.tournamentId);

    await db
      .delete(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.id, data.memberId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Delete all teams for a tournament
// ──────────────────────────────────────────────

export const deleteAllTeamsFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);
    await requireTournamentSetup(data.tournamentId);

    // Cascade on tournament_team_members.team_id handles member cleanup
    await db
      .delete(tournamentTeams)
      .where(eq(tournamentTeams.tournamentId, data.tournamentId));

    return { success: true };
  });
