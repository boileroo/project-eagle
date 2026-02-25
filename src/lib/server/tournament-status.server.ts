import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { tournaments } from '@/db/schema';
import { isTournamentInSetup } from '../tournament-status';

export async function requireTournamentSetup(tournamentId: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
    columns: { status: true },
  });
  if (!tournament) throw new Error('Tournament not found');
  if (!isTournamentInSetup(tournament.status)) {
    throw new Error(
      'This action is only available while the tournament is in setup',
    );
  }
  return tournament;
}
