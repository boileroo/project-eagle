// ──────────────────────────────────────────────
// Tournament Standings Aggregation Engine
//
// Pure TypeScript. No DB access. No framework coupling.
//
// Takes per-round competition results and aggregates
// them into tournament-wide standings.
// ──────────────────────────────────────────────

import type { AggregationConfig } from '../competitions';
import type { CompetitionResult, CompetitionInput, GroupData } from './index';
import { calculateCompetitionResults } from './index';

// ──────────────────────────────────────────────
// Input Types
// ──────────────────────────────────────────────

/** A bonus award that contributes points to individual standings */
export interface ContributorBonusAward {
  roundId: string;
  roundNumber: number | null;
  /** The round participant who won the bonus */
  roundParticipantId: string;
  /** Points to add (e.g. 1 stableford point) */
  bonusPoints: number;
}

export interface RoundCompetitionData {
  roundId: string;
  roundNumber: number | null;
  /** Groups in this round (needed for within_group competitions) */
  groups: GroupData[];
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
  /** Bonus points included in total (contributor mode bonuses) */
  bonusTotal: number;
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
  contributorBonuses?: ContributorBonusAward[],
): StandingsResult {
  switch (config.method) {
    case 'sum_stableford':
      return aggregateSumStableford(rounds, participantType, contributorBonuses ?? []);
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
  contributorBonuses: ContributorBonusAward[],
): StandingsResult {
  const totals = new Map<
    string,
    { displayName: string; total: number; roundsPlayed: number; perRound: StandingEntry['perRound']; bonusTotal: number }
  >();

  for (const round of rounds) {
    for (const input of round.competitionInputs) {
      const results = expandByGroup(input, round.groups);
      for (const result of results) {
        if (result.type !== 'stableford') continue;

        for (const entry of result.result.leaderboard) {
          if (participantType === 'team') continue; // stableford is individual-only for now

          const existing = totals.get(entry.roundParticipantId) ?? {
            displayName: entry.displayName,
            total: 0,
            roundsPlayed: 0,
            perRound: [],
            bonusTotal: 0,
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
  }

  // Add contributor bonus points to individual totals
  if (participantType === 'individual') {
    for (const bonus of contributorBonuses) {
      const existing = totals.get(bonus.roundParticipantId);
      if (existing) {
        existing.total += bonus.bonusPoints;
        existing.bonusTotal += bonus.bonusPoints;
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
    { displayName: string; total: number; roundsPlayed: number; perRound: StandingEntry['perRound']; bonusTotal: number }
  >();

  for (const round of rounds) {
    for (const input of round.competitionInputs) {
      const results = expandByGroup(input, round.groups);
      for (const result of results) {
        if (result.type !== 'stroke_play') continue;

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
            bonusTotal: 0,
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
    { displayName: string; total: number; roundsPlayed: number; perRound: StandingEntry['perRound']; bonusTotal: number }
  >();

  for (const round of rounds) {
    for (const input of round.competitionInputs) {
      const results = expandByGroup(input, round.groups);
      for (const result of results) {
        if (!result) continue;

        if (
          result.type === 'match_play' &&
          participantType === 'individual'
        ) {
          for (const match of result.result.matches) {
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
                bonusTotal: 0,
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

        if (
          result.type === 'match_play' &&
          participantType === 'team'
        ) {
          // Map individual match play results to teams
          // Each player's points roll up to their team
          const inputTeams = input.teams ?? [];
          const playerTeamMap = new Map<string, { teamId: string; teamName: string }>();
          for (const team of inputTeams) {
            for (const memberId of team.memberParticipantIds) {
              playerTeamMap.set(memberId, {
                teamId: team.roundTeamId,
                teamName: team.name,
              });
            }
          }

          for (const match of result.result.matches) {
            const sides = [
              { rpId: match.playerA.roundParticipantId, pts: match.pointsA },
              { rpId: match.playerB.roundParticipantId, pts: match.pointsB },
            ];
            for (const side of sides) {
              const team = playerTeamMap.get(side.rpId);
              if (!team) continue;

              const existing = totals.get(team.teamId) ?? {
                displayName: team.teamName,
                total: 0,
                roundsPlayed: 0,
                perRound: [],
                bonusTotal: 0,
              };

              existing.total += side.pts;
              // Only increment roundsPlayed once per round per team
              const alreadyHasRound = existing.perRound.find(
                (pr) => pr.roundId === round.roundId,
              );
              if (alreadyHasRound) {
                alreadyHasRound.value += side.pts;
              } else {
                existing.roundsPlayed += 1;
                existing.perRound.push({
                  roundId: round.roundId,
                  roundNumber: round.roundNumber,
                  value: side.pts,
                });
              }
              totals.set(team.teamId, existing);
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
                bonusTotal: 0,
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

/**
 * For a given competition input, return an array of results.
 * For `all`-scope competitions, returns a single result.
 * For `within_group` competitions, returns one result per group
 * (filtering participants/scores to that group).
 */
function expandByGroup(
  input: CompetitionInput,
  groups: GroupData[],
): CompetitionResult[] {
  if (input.competition.groupScope !== 'within_group' || groups.length === 0) {
    const r = safeCalculate(input);
    return r ? [r] : [];
  }

  const results: CompetitionResult[] = [];
  for (const group of groups) {
    const memberIds = new Set(group.memberParticipantIds);
    const groupInput: CompetitionInput = {
      ...input,
      participants: input.participants.filter((p) =>
        memberIds.has(p.roundParticipantId),
      ),
      scores: input.scores.filter((s) =>
        memberIds.has(s.roundParticipantId),
      ),
      teams: input.teams?.filter((t) =>
        t.memberParticipantIds.some((id) => memberIds.has(id)),
      ),
    };
    const r = safeCalculate(groupInput);
    if (r) results.push(r);
  }
  return results;
}
