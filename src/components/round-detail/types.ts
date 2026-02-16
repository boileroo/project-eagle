import type { getRoundFn } from '@/lib/rounds.server';
import type { getScorecardFn } from '@/lib/scores.server';
import type { getRoundCompetitionsFn } from '@/lib/competitions.server';
import type { getTournamentFn } from '@/lib/tournaments.server';

export type RoundData = Awaited<ReturnType<typeof getRoundFn>>;
export type ScorecardData = Awaited<ReturnType<typeof getScorecardFn>>;
export type CompetitionsData = Awaited<
  ReturnType<typeof getRoundCompetitionsFn>
>;
export type TournamentData = Awaited<ReturnType<typeof getTournamentFn>>;
