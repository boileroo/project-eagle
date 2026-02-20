import { getRequest } from '@tanstack/react-start/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { persons, tournaments, tournamentParticipants } from '@/db/schema';
import { createSupabaseServerClient } from './supabase.server';

// ──────────────────────────────────────────────
// Get authenticated user or throw
// ──────────────────────────────────────────────

export async function requireAuth() {
  const request = getRequest();
  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

// ──────────────────────────────────────────────
// Require commissioner role for a tournament
// Returns the authenticated user (so callers don't
// need a separate requireAuth call)
// ──────────────────────────────────────────────

export async function requireCommissioner(tournamentId: string) {
  const user = await requireAuth();

  // Tournament creator always has commissioner-level access
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (tournament?.createdByUserId === user.id) return user;

  const person = await db.query.persons.findFirst({
    where: eq(persons.userId, user.id),
  });
  if (!person) throw new Error('No person record found for your account');

  const tp = await db.query.tournamentParticipants.findFirst({
    where: and(
      eq(tournamentParticipants.tournamentId, tournamentId),
      eq(tournamentParticipants.personId, person.id),
    ),
  });
  if (!tp || tp.role !== 'commissioner') {
    throw new Error('Only the commissioner can perform this action');
  }

  return user;
}

// ──────────────────────────────────────────────
// Require commissioner or marker role for a tournament
// ──────────────────────────────────────────────

export async function requireCommissionerOrMarker(tournamentId: string) {
  const user = await requireAuth();

  // Tournament creator always has commissioner-level access
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (tournament?.createdByUserId === user.id) return user;

  const person = await db.query.persons.findFirst({
    where: eq(persons.userId, user.id),
  });
  if (!person) throw new Error('No person record found for your account');

  const tp = await db.query.tournamentParticipants.findFirst({
    where: and(
      eq(tournamentParticipants.tournamentId, tournamentId),
      eq(tournamentParticipants.personId, person.id),
    ),
  });
  if (!tp || (tp.role !== 'commissioner' && tp.role !== 'marker')) {
    throw new Error('Only a commissioner or marker can perform this action');
  }

  return user;
}
