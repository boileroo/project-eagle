import type { getTournamentFn } from '@/lib/tournaments.server';
import type { AggregationConfig } from '@/lib/competitions';

export type TournamentLoaderData = Awaited<ReturnType<typeof getTournamentFn>>;

export type StandingConfig = {
  id: string;
  name: string;
  participantType: string;
  aggregationConfig: Record<string, unknown>;
};

export type ComputedStanding = {
  standing: {
    id: string;
    name: string;
    participantType: string;
    aggregationConfig: AggregationConfig;
  };
  rounds: { id: string; roundNumber: number | null; courseName: string }[];
  leaderboard: {
    entityId: string;
    displayName: string;
    total: number;
    roundsPlayed: number;
    perRound: { roundId: string; roundNumber: number | null; value: number }[];
    bonusTotal: number;
  }[];
  sortDirection: 'desc' | 'asc';
};

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
