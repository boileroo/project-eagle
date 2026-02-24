import type { getRoundFn } from '@/lib/rounds.server';
import type { getScorecardFn } from '@/lib/scores.server';
import type { getRoundCompetitionsFn } from '@/lib/competitions.server';

export type RoundData = Awaited<ReturnType<typeof getRoundFn>>;
export type ScorecardData = Awaited<ReturnType<typeof getScorecardFn>>;
export type CompetitionsData = Awaited<
  ReturnType<typeof getRoundCompetitionsFn>
>;
