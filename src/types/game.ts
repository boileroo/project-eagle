import type {
  getTournamentLeaderboardFn,
  getIndividualScoreboardFn,
} from '@/lib/scoreboards.server';
import type { TournamentLeaderboardRow } from '@/lib/domain/tournament-leaderboard';
import type { getSideGamesFn } from '@/lib/games.server';

export type LeaderboardData = Awaited<
  ReturnType<typeof getTournamentLeaderboardFn>
>;

export type LeaderboardRow = TournamentLeaderboardRow;

export type GameData = {
  id: string;
  format: string;
  name: string;
};

export type SideGamesData = Awaited<ReturnType<typeof getSideGamesFn>>;
export type SideGameData = SideGamesData[number];

export type ScoreboardData = Awaited<
  ReturnType<typeof getIndividualScoreboardFn>
>;
