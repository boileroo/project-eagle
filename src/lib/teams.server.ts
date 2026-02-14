import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  tournamentTeams,
  tournamentTeamMembers,
  tournamentParticipants,
  tournaments,
} from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';
import type {
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
} from './validators';

// ──────────────────────────────────────────────
// Helper: get authenticated user or throw
// ──────────────────────────────────────────────

async function requireAuth() {
  const request = getRequest();
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

// ──────────────────────────────────────────────
// Create a team
// ──────────────────────────────────────────────

export const createTeamFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateTeamInput) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    // Verify tournament exists
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');

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
  .inputValidator((data: UpdateTeamInput) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    const existing = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, data.teamId),
    });
    if (!existing) throw new Error('Team not found');

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
  .inputValidator((data: { teamId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    const existing = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, data.teamId),
    });
    if (!existing) throw new Error('Team not found');

    await db
      .delete(tournamentTeams)
      .where(eq(tournamentTeams.id, data.teamId));

    return { success: true };
  });

// ──────────────────────────────────────────────
// Add a member to a team
// ──────────────────────────────────────────────

export const addTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((data: AddTeamMemberInput) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    // Verify team exists
    const team = await db.query.tournamentTeams.findFirst({
      where: eq(tournamentTeams.id, data.teamId),
    });
    if (!team) throw new Error('Team not found');

    // Verify participant exists and belongs to the same tournament
    const participant = await db.query.tournamentParticipants.findFirst({
      where: eq(tournamentParticipants.id, data.participantId),
    });
    if (!participant) throw new Error('Participant not found');
    if (participant.tournamentId !== team.tournamentId) {
      throw new Error('Participant is not in this tournament');
    }

    // Check not already in this team
    const existingMembership =
      await db.query.tournamentTeamMembers.findFirst({
        where: and(
          eq(tournamentTeamMembers.teamId, data.teamId),
          eq(tournamentTeamMembers.participantId, data.participantId),
        ),
      });
    if (existingMembership) throw new Error('Already a member of this team');

    // Remove from any other team in the same tournament first
    const otherTeams = await db.query.tournamentTeams.findMany({
      where: and(
        eq(tournamentTeams.tournamentId, team.tournamentId),
      ),
    });
    const otherTeamIds = otherTeams.map((t) => t.id);
    for (const otherTeamId of otherTeamIds) {
      if (otherTeamId === data.teamId) continue;
      await db
        .delete(tournamentTeamMembers)
        .where(
          and(
            eq(tournamentTeamMembers.teamId, otherTeamId),
            eq(tournamentTeamMembers.participantId, data.participantId),
          ),
        );
    }

    const [member] = await db
      .insert(tournamentTeamMembers)
      .values({
        teamId: data.teamId,
        participantId: data.participantId,
      })
      .returning();

    return { memberId: member.id };
  });

// ──────────────────────────────────────────────
// Remove a member from a team
// ──────────────────────────────────────────────

export const removeTeamMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth();

    const existing = await db.query.tournamentTeamMembers.findFirst({
      where: eq(tournamentTeamMembers.id, data.memberId),
    });
    if (!existing) throw new Error('Team member not found');

    await db
      .delete(tournamentTeamMembers)
      .where(eq(tournamentTeamMembers.id, data.memberId));

    return { success: true };
  });
