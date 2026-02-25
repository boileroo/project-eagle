import type { getTournamentLeaderboardFn } from '@/lib/scoreboards.server';
import type { TournamentLeaderboardRow } from '@/lib/domain/tournament-leaderboard';

export type LeaderboardData = Awaited<
  ReturnType<typeof getTournamentLeaderboardFn>
>;

export type LeaderboardRow = TournamentLeaderboardRow;

export type CompetitionData = {
  id: string;
  formatType: string;
  name: string;
};
