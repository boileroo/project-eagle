import type { getTournamentFn } from '@/lib/tournaments.server';

export type TournamentLoaderData = Awaited<ReturnType<typeof getTournamentFn>>;

export type TeamsSectionTournament = {
  id: string;
  participants: {
    id: string;
    personId: string;
    role: string;
    person: { id: string; displayName: string; userId: string | null };
  }[];
  teams: {
    id: string;
    name: string;
    members: {
      id: string;
      participantId: string;
      participant: {
        id: string;
        person: { id: string; displayName: string };
      };
    }[];
  }[];
};
