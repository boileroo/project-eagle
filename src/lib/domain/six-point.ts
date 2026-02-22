// ──────────────────────────────────────────────
// Six Point Scoring Engine
//
// Pure functions. No DB access.
//
// Revised rules (3-player format):
//   - 3 players per group
//   - Fixed point distribution: 1st = 4, 2nd = 2, 3rd = 0
//   - Scoring basis: 'stableford' (higher is better) or 'gross' (lower is better)
//   - Tie-splitting per hole:
//       Two tied 1st, one 3rd   → 3 / 3 / 0
//       One 1st, two tied 2nd   → 4 / 1 / 1
//       All three tied           → 2 / 2 / 2
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import type { CompetitionInput } from './index';
import type { SixPointConfig } from '../competitions';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface SixPointHoleScore {
  holeNumber: number;
  playerScores: {
    roundParticipantId: string;
    /** Stableford points or gross strokes, depending on scoringBasis */
    score: number;
    points: number;
  }[];
}

export interface SixPointPlayerResult {
  roundParticipantId: string;
  displayName: string;
  holeScores: SixPointHoleScore[];
  totalPoints: number;
  holesCompleted: number;
  rank: number;
}

export interface SixPointResult {
  leaderboard: SixPointPlayerResult[];
}

// ──────────────────────────────────────────────
// Fixed distribution
// ──────────────────────────────────────────────

const FIXED_DISTRIBUTION = [4, 2, 0];

// ──────────────────────────────────────────────
// Distribute points with tie-splitting (3-player)
// ──────────────────────────────────────────────

/**
 * Given sorted values for 3 players (highest first for stableford, lowest
 * first for gross) and the fixed distribution [4, 2, 0], return the points
 * each player at index i should receive.
 */
function distributePoints(
  sortedValues: number[],
  distribution: number[],
): number[] {
  const n = sortedValues.length;
  const result = new Array<number>(n).fill(0);
  let i = 0;

  while (i < n) {
    // Find the extent of the tie
    let j = i;
    while (j < n && sortedValues[j] === sortedValues[i]) j++;

    // Sum the points for positions i..j-1
    let sharedPoints = 0;
    for (let k = i; k < j; k++) {
      sharedPoints += distribution[k] ?? 0;
    }
    const perPlayer = sharedPoints / (j - i);

    for (let k = i; k < j; k++) {
      result[k] = perPlayer;
    }

    i = j;
  }

  return result;
}

// ──────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────

export function calculateSixPoint(
  input: CompetitionInput,
  config: SixPointConfig['config'],
): SixPointResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );
  const scoringBasis = config.scoringBasis;

  // Accumulate per-player totals
  const playerTotals = new Map<
    string,
    {
      displayName: string;
      totalPoints: number;
      holesCompleted: number;
      holeScores: SixPointHoleScore[];
    }
  >();

  for (const p of input.participants) {
    playerTotals.set(p.roundParticipantId, {
      displayName: p.displayName,
      totalPoints: 0,
      holesCompleted: 0,
      holeScores: [],
    });
  }

  for (const hole of sortedHoles) {
    // Collect scores for all players on this hole
    const playerScores: {
      roundParticipantId: string;
      score: number;
    }[] = [];

    let allScored = true;
    for (const p of input.participants) {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key);
      if (strokes === undefined) {
        allScored = false;
        playerScores.push({
          roundParticipantId: p.roundParticipantId,
          score: 0,
        });
      } else if (scoringBasis === 'gross') {
        playerScores.push({
          roundParticipantId: p.roundParticipantId,
          score: strokes,
        });
      } else {
        // stableford
        const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
        playerScores.push({
          roundParticipantId: p.roundParticipantId,
          score: stablefordPoints(strokes, hole.par, received),
        });
      }
    }

    if (!allScored) {
      // Record hole as unscored
      const holeScore: SixPointHoleScore = {
        holeNumber: hole.holeNumber,
        playerScores: playerScores.map((ps) => ({ ...ps, points: 0 })),
      };
      for (const ps of playerScores) {
        playerTotals.get(ps.roundParticipantId)!.holeScores.push(holeScore);
      }
      continue;
    }

    // Sort: stableford → descending (higher is better); gross → ascending (lower is better)
    const sorted =
      scoringBasis === 'gross'
        ? [...playerScores].sort((a, b) => a.score - b.score)
        : [...playerScores].sort((a, b) => b.score - a.score);

    const sortedValues = sorted.map((s) => s.score);
    const pointAllocation = distributePoints(sortedValues, FIXED_DISTRIBUTION);

    // Map from participantId → points earned
    const pointsMap = new Map<string, number>();
    for (let i = 0; i < sorted.length; i++) {
      pointsMap.set(sorted[i].roundParticipantId, pointAllocation[i]);
    }

    const holeScore: SixPointHoleScore = {
      holeNumber: hole.holeNumber,
      playerScores: playerScores.map((ps) => ({
        ...ps,
        points: pointsMap.get(ps.roundParticipantId) ?? 0,
      })),
    };

    for (const ps of playerScores) {
      const entry = playerTotals.get(ps.roundParticipantId)!;
      entry.holeScores.push(holeScore);
      entry.totalPoints += pointsMap.get(ps.roundParticipantId) ?? 0;
      entry.holesCompleted++;
    }
  }

  // Build leaderboard
  const leaderboard: SixPointPlayerResult[] = [...playerTotals.entries()].map(
    ([roundParticipantId, data]) => ({
      roundParticipantId,
      displayName: data.displayName,
      holeScores: data.holeScores,
      totalPoints: data.totalPoints,
      holesCompleted: data.holesCompleted,
      rank: 0,
    }),
  );

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

  let rank = 1;
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].totalPoints < leaderboard[i - 1].totalPoints) {
      rank = i + 1;
    }
    leaderboard[i].rank = rank;
  }

  return { leaderboard };
}
