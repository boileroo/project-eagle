// ──────────────────────────────────────────────
// Tournament Standings Aggregation Engine
//
// Pure TypeScript. No DB access. No framework coupling.
//
// Takes per-round competition results and aggregates
// them into tournament-wide standings.
// ──────────────────────────────────────────────

import type { AggregationConfig } from '../competitions';
import type { CompetitionResult, CompetitionInput } from './index';
import { calculateCompetitionResults } from './index';

// ──────────────────────────────────────────────
// Input Types
// ──────────────────────────────────────────────

export interface RoundCompetitionData {
  roundId: string;
  roundNumber: number | null;
  /** Pre-built competition inputs for this round */
  competitionInputs: CompetitionInput[];
}

export interface StandingEntry {
  /** Person ID for individual, team ID for team */
  entityId: string;
  displayName: string;
  /** Total aggregated score/points */
  total: number;
  /** Number of rounds contributing */
  roundsPlayed: number;
  /** Per-round breakdown */
  perRound: { roundId: string; roundNumber: number | null; value: number }[];
}

export interface StandingsResult {
  leaderboard: StandingEntry[];
  /** Higher is better (stableford, match wins) vs lower is better (strokes) */
  sortDirection: 'desc' | 'asc';
}

// ──────────────────────────────────────────────
// Main Dispatcher
// ──────────────────────────────────────────────

export function calculateStandings(
  config: AggregationConfig,
  rounds: RoundCompetitionData[],
  participantType: 'individual' | 'team',
): StandingsResult {
  switch (config.method) {
    case 'sum_stableford':
      return aggregateSumStableford(rounds, participantType);
    case 'lowest_strokes':
      return aggregateLowestStrokes(rounds, participantType, config.config);
    case 'match_wins':
      return aggregateMatchWins(rounds, participantType, config.config);
  }
}

// ──────────────────────────────────────────────
// Sum Stableford
//
// Sums stableford points across all rounds for
// each participant. Highest total wins.
// ──────────────────────────────────────────────

function aggregateSumStableford(
  rounds: RoundCompetitionData[],
  participantType: 'individual' | 'team',
): StandingsResult {
  const totals = new Map<
    string,
    { displayName: string; total: number; roundsPlayed: number; perRound: StandingEntry['perRound'] }
  >();

  for (const round of rounds) {
    for (const input of round.competitionInputs) {
      const result = safeCalculate(input);
      if (!result || result.type !== 'stableford') continue;

      for (const entry of result.result.leaderboard) {
        if (participantType === 'team') continue; // stableford is individual-only for now

        const existing = totals.get(entry.roundParticipantId) ?? {
          displayName: entry.displayName,
          total: 0,
          roundsPlayed: 0,
          perRound: [],
        };
        existing.total += entry.totalPoints;
        existing.roundsPlayed += 1;
        existing.perRound.push({
          roundId: round.roundId,
          roundNumber: round.roundNumber,
          value: entry.totalPoints,
        });
        totals.set(entry.roundParticipantId, existing);
      }
    }
  }

  const leaderboard: StandingEntry[] = Array.from(totals.entries()).map(
    ([entityId, data]) => ({
      entityId,
      ...data,
    }),
  );
  leaderboard.sort((a, b) => b.total - a.total);

  return { leaderboard, sortDirection: 'desc' };
}

// ──────────────────────────────────────────────
// Lowest Strokes
//
// Sums net or gross strokes across all rounds.
// Lowest total wins.
// ──────────────────────────────────────────────

function aggregateLowestStrokes(
  rounds: RoundCompetitionData[],
  participantType: 'individual' | 'team',
  config: { scoringBasis: 'net_strokes' | 'gross_strokes' },
): StandingsResult {
  const totals = new Map<
    string,
    { displayName: string; total: number; roundsPlayed: number; perRound: StandingEntry['perRound'] }
  >();

  for (const round of rounds) {
    for (const input of round.competitionInputs) {
      const result = safeCalculate(input);
      if (!result || result.type !== 'stroke_play') continue;

      if (participantType === 'team') continue; // stroke play is individual-only

      for (const entry of result.result.leaderboard) {
        const value =
          config.scoringBasis === 'net_strokes'
            ? entry.rankingScore
            : entry.grossTotal;

        const existing = totals.get(entry.roundParticipantId) ?? {
          displayName: entry.displayName,
          total: 0,
          roundsPlayed: 0,
          perRound: [],
        };
        existing.total += value;
        existing.roundsPlayed += 1;
        existing.perRound.push({
          roundId: round.roundId,
          roundNumber: round.roundNumber,
          value,
        });
        totals.set(entry.roundParticipantId, existing);
      }
    }
  }

  const leaderboard: StandingEntry[] = Array.from(totals.entries()).map(
    ([entityId, data]) => ({
      entityId,
      ...data,
    }),
  );
  leaderboard.sort((a, b) => a.total - b.total);

  return { leaderboard, sortDirection: 'asc' };
}

// ──────────────────────────────────────────────
// Match Wins
//
// Counts match wins across all rounds.
// 1 point per match win, configurable per-half.
// Works for both individual match play and team best ball.
// ──────────────────────────────────────────────

function aggregateMatchWins(
  rounds: RoundCompetitionData[],
  participantType: 'individual' | 'team',
  config: { pointsPerWin: number; pointsPerHalf: number },
): StandingsResult {
  const totals = new Map<
    string,
    { displayName: string; total: number; roundsPlayed: number; perRound: StandingEntry['perRound'] }
  >();

  for (const round of rounds) {
    for (const input of round.competitionInputs) {
      const result = safeCalculate(input);
      if (!result) continue;

      if (
        result.type === 'match_play' &&
        participantType === 'individual'
      ) {
        for (const match of result.result.matches) {
          // Each match has playerA, playerB, result
          const entries = [
            {
              id: match.playerA.roundParticipantId,
              name: match.playerA.displayName,
            },
            {
              id: match.playerB.roundParticipantId,
              name: match.playerB.displayName,
            },
          ];

          for (const entry of entries) {
            const existing = totals.get(entry.id) ?? {
              displayName: entry.name,
              total: 0,
              roundsPlayed: 0,
              perRound: [],
            };

            let pts = 0;
            if (match.winner === 'halved') {
              pts = config.pointsPerHalf;
            } else if (
              (match.winner === 'A' &&
                entry.id === match.playerA.roundParticipantId) ||
              (match.winner === 'B' &&
                entry.id === match.playerB.roundParticipantId)
            ) {
              pts = config.pointsPerWin;
            }

            existing.total += pts;
            existing.roundsPlayed += 1;
            existing.perRound.push({
              roundId: round.roundId,
              roundNumber: round.roundNumber,
              value: pts,
            });
            totals.set(entry.id, existing);
          }
        }
      }

      if (result.type === 'best_ball' && participantType === 'team') {
        for (const match of result.result.matches) {
          const entries = [
            { id: match.teamA.roundTeamId, name: match.teamA.name },
            { id: match.teamB.roundTeamId, name: match.teamB.name },
          ];

          for (const entry of entries) {
            const existing = totals.get(entry.id) ?? {
              displayName: entry.name,
              total: 0,
              roundsPlayed: 0,
              perRound: [],
            };

            let pts = 0;
            if (match.winner === 'halved') {
              pts = config.pointsPerHalf;
            } else if (
              (match.winner === 'A' &&
                entry.id === match.teamA.roundTeamId) ||
              (match.winner === 'B' &&
                entry.id === match.teamB.roundTeamId)
            ) {
              pts = config.pointsPerWin;
            }

            existing.total += pts;
            existing.roundsPlayed += 1;
            existing.perRound.push({
              roundId: round.roundId,
              roundNumber: round.roundNumber,
              value: pts,
            });
            totals.set(entry.id, existing);
          }
        }
      }
    }
  }

  const leaderboard: StandingEntry[] = Array.from(totals.entries()).map(
    ([entityId, data]) => ({
      entityId,
      ...data,
    }),
  );
  leaderboard.sort((a, b) => b.total - a.total);

  return { leaderboard, sortDirection: 'desc' };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function safeCalculate(input: CompetitionInput): CompetitionResult | null {
  try {
    return calculateCompetitionResults(input);
  } catch {
    return null;
  }
}
