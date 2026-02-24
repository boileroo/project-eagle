import type { getTournamentLeaderboardFn } from '@/lib/competitions.server';

export type LeaderboardData = Awaited<
  ReturnType<typeof getTournamentLeaderboardFn>
>;

export type LeaderboardRow = {
  personId: string;
  displayName: string;
  rank: number;
  roundsPlayed: number;
  grossStrokes: number;
  netStrokes: number;
  stableford: number;
  total: number;
};

export type CompetitionData = {
  id: string;
  formatType: string;
  name: string;
};
