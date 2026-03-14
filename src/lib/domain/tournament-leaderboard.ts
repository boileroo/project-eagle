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

import type {
  IndividualScoreboardRow,
  StandaloneBadge,
} from './individual-scoreboard';

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

export type TournamentLeaderboardRoundStatus =
  | 'counted'
  | 'incomplete'
  | 'absent'
  | 'pending';

export interface TournamentLeaderboardRoundCell {
  roundId: string;
  roundName: string;
  totalHoles: number;
  isFinalised: boolean;
  status: TournamentLeaderboardRoundStatus;
  holesCompleted: number;
  grossStrokes: number | null;
  netStrokes: number | null;
  stableford: number | null;
  contributorBonusTotal: number | null;
  total: number | null;
  standaloneBadges: StandaloneBadge[];
}

export interface TournamentLeaderboardRow {
  roundParticipantIds: string[];
  personId: string;
  displayName: string;
  /** Only rounds where the player has all holes scored */
  roundContributions: TournamentLeaderboardRoundContribution[];
  roundCells: TournamentLeaderboardRoundCell[];
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
  const finalisedRounds = input.rounds.filter((r) => r.isFinalised);

  const personMap = new Map<
    string,
    {
      displayName: string;
      roundParticipantIds: string[];
      roundContributions: TournamentLeaderboardRoundContribution[];
      roundCellMap: Map<string, TournamentLeaderboardRoundCell>;
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
          roundCellMap: new Map(),
          grossStrokes: 0,
          netStrokes: 0,
          stableford: 0,
          contributorBonusTotal: 0,
          total: 0,
        });
      }

      const entry = personMap.get(row.personId)!;
      entry.roundParticipantIds.push(row.roundParticipantId);

      const isCounted = row.holesCompleted === round.totalHoles;
      entry.roundCellMap.set(round.roundId, {
        roundId: round.roundId,
        roundName: round.roundName,
        totalHoles: round.totalHoles,
        isFinalised: round.isFinalised,
        status: isCounted ? 'counted' : 'incomplete',
        holesCompleted: row.holesCompleted,
        grossStrokes: isCounted ? row.grossStrokes : null,
        netStrokes: isCounted ? row.netStrokes : null,
        stableford: isCounted ? row.stableford : null,
        contributorBonusTotal: isCounted ? row.contributorBonusTotal : null,
        total: isCounted ? row.total : null,
        standaloneBadges: row.standaloneBadges,
      });

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

  for (const round of input.rounds.filter((r) => !r.isFinalised)) {
    for (const row of round.scoreboardRows) {
      if (!personMap.has(row.personId)) {
        personMap.set(row.personId, {
          displayName: row.displayName,
          roundParticipantIds: [],
          roundContributions: [],
          roundCellMap: new Map(),
          grossStrokes: 0,
          netStrokes: 0,
          stableford: 0,
          contributorBonusTotal: 0,
          total: 0,
        });
      }

      const entry = personMap.get(row.personId)!;
      if (!entry.roundParticipantIds.includes(row.roundParticipantId)) {
        entry.roundParticipantIds.push(row.roundParticipantId);
      }
      entry.roundCellMap.set(round.roundId, {
        roundId: round.roundId,
        roundName: round.roundName,
        totalHoles: round.totalHoles,
        isFinalised: false,
        status: 'pending',
        holesCompleted: row.holesCompleted,
        grossStrokes: null,
        netStrokes: null,
        stableford: null,
        contributorBonusTotal: null,
        total: null,
        standaloneBadges: row.standaloneBadges,
      });
    }
  }

  const rows: TournamentLeaderboardRow[] = [...personMap.entries()].map(
    ([personId, data]) => {
      const roundCells = input.rounds.map((round) => {
        const existing = data.roundCellMap.get(round.roundId);
        if (existing) return existing;

        return {
          roundId: round.roundId,
          roundName: round.roundName,
          totalHoles: round.totalHoles,
          isFinalised: round.isFinalised,
          status: round.isFinalised ? 'absent' : 'pending',
          holesCompleted: 0,
          grossStrokes: null,
          netStrokes: null,
          stableford: null,
          contributorBonusTotal: null,
          total: null,
          standaloneBadges: [],
        } satisfies TournamentLeaderboardRoundCell;
      });

      return {
        personId,
        displayName: data.displayName,
        roundParticipantIds: data.roundParticipantIds,
        roundContributions: data.roundContributions,
        roundCells,
        roundsPlayed: data.roundContributions.length,
        grossStrokes: data.grossStrokes,
        netStrokes: data.netStrokes,
        stableford: data.stableford,
        contributorBonusTotal: data.contributorBonusTotal,
        total: data.total,
        rank: 0,
      };
    },
  );

  rows.sort((a, b) => {
    if (b.stableford !== a.stableford) return b.stableford - a.stableford;
    return a.grossStrokes - b.grossStrokes;
  });

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
