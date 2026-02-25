// ──────────────────────────────────────────────
// Tournament Leaderboard Engine
//
// Pure functions. No DB access.
// Auto-computed individual leaderboard across all rounds
// in a tournament.
//
// Aggregation rules:
//   - Only includes rounds that are marked finalised.
//   - A player's round is only included if they have scores
//     for ALL holes on that round's course card (holesCompleted === totalHoles).
//   - Missing rounds (player not in round, or not all holes scored) are
//     excluded — not zeroed.
// ──────────────────────────────────────────────

import type { IndividualScoreboardRow } from './individual-scoreboard';

// ──────────────────────────────────────────────
// Input types
// ──────────────────────────────────────────────

export interface TournamentLeaderboardRoundInput {
  roundId: string;
  roundName: string;
  /** Round is finalised — only finalised rounds are included */
  isFinalised: boolean;
  /** Total number of holes in this round's course card */
  totalHoles: number;
  /** Pre-computed individual scoreboard rows for this round */
  scoreboardRows: IndividualScoreboardRow[];
}

export interface TournamentLeaderboardInput {
  rounds: TournamentLeaderboardRoundInput[];
}

// ──────────────────────────────────────────────
// Output types
// ──────────────────────────────────────────────

export interface TournamentLeaderboardRoundContribution {
  roundId: string;
  roundName: string;
  grossStrokes: number;
  netStrokes: number;
  stableford: number;
  contributorBonusTotal: number;
  total: number;
}

export interface TournamentLeaderboardRow {
  roundParticipantIds: string[];
  personId: string;
  displayName: string;
  /** Only rounds where the player has all holes scored */
  roundContributions: TournamentLeaderboardRoundContribution[];
  roundsPlayed: number;
  grossStrokes: number;
  netStrokes: number;
  stableford: number;
  contributorBonusTotal: number;
  total: number;
  rank: number;
}

export interface TournamentLeaderboardResult {
  rows: TournamentLeaderboardRow[];
}

// ──────────────────────────────────────────────
// Main function
// ──────────────────────────────────────────────

/**
 * Calculates the tournament-wide individual leaderboard by aggregating
 * finalised round scoreboard rows.
 *
 * Only includes rounds marked as finalised. A player's round is included
 * only if they have scores for all holes (holesCompleted === totalHoles).
 * Missing rounds are excluded — not zeroed. Players are ranked by total
 * descending, with stableford as a tiebreaker and gross strokes second.
 */
export function calculateTournamentLeaderboard(
  input: TournamentLeaderboardInput,
): TournamentLeaderboardResult {
  // Only consider finalised rounds
  const finalisedRounds = input.rounds.filter((r) => r.isFinalised);

  // Aggregate per person
  // Key: personId
  const personMap = new Map<
    string,
    {
      displayName: string;
      roundParticipantIds: string[];
      roundContributions: TournamentLeaderboardRoundContribution[];
      grossStrokes: number;
      netStrokes: number;
      stableford: number;
      contributorBonusTotal: number;
      total: number;
    }
  >();

  for (const round of finalisedRounds) {
    for (const row of round.scoreboardRows) {
      // Only include if player has scored all holes in this round
      if (row.holesCompleted < round.totalHoles) continue;

      if (!personMap.has(row.personId)) {
        personMap.set(row.personId, {
          displayName: row.displayName,
          roundParticipantIds: [],
          roundContributions: [],
          grossStrokes: 0,
          netStrokes: 0,
          stableford: 0,
          contributorBonusTotal: 0,
          total: 0,
        });
      }

      const entry = personMap.get(row.personId)!;
      entry.roundParticipantIds.push(row.roundParticipantId);
      entry.roundContributions.push({
        roundId: round.roundId,
        roundName: round.roundName,
        grossStrokes: row.grossStrokes,
        netStrokes: row.netStrokes,
        stableford: row.stableford,
        contributorBonusTotal: row.contributorBonusTotal,
        total: row.total,
      });
      entry.grossStrokes += row.grossStrokes;
      entry.netStrokes += row.netStrokes;
      entry.stableford += row.stableford;
      entry.contributorBonusTotal += row.contributorBonusTotal;
      entry.total += row.total;
    }
  }

  // Build rows
  const rows: TournamentLeaderboardRow[] = [...personMap.entries()].map(
    ([personId, data]) => ({
      personId,
      displayName: data.displayName,
      roundParticipantIds: data.roundParticipantIds,
      roundContributions: data.roundContributions,
      roundsPlayed: data.roundContributions.length,
      grossStrokes: data.grossStrokes,
      netStrokes: data.netStrokes,
      stableford: data.stableford,
      contributorBonusTotal: data.contributorBonusTotal,
      total: data.total,
      rank: 0,
    }),
  );

  // Sort by total stableford descending, then gross ascending as tiebreak
  rows.sort((a, b) => {
    if (b.stableford !== a.stableford) return b.stableford - a.stableford;
    return a.grossStrokes - b.grossStrokes;
  });

  // Assign ranks (ties share position)
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) {
      const prev = rows[i - 1];
      const curr = rows[i];
      if (
        curr.stableford !== prev.stableford ||
        curr.grossStrokes !== prev.grossStrokes
      ) {
        rank = i + 1;
      }
    }
    rows[i].rank = rank;
  }

  return { rows };
}
