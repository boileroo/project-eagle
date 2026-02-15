// ──────────────────────────────────────────────
// Stableford Scoring Engine
//
// Pure functions. No DB access.
// Standard stableford points:
//   Double bogey or worse: 0
//   Bogey: 1
//   Par: 2
//   Birdie: 3
//   Eagle: 4
//   Albatross: 5
//   (Applied to NET score against par)
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import type { CompetitionInput, HoleData, ResolvedScore } from './index';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface StablefordHoleScore {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossStrokes: number | null;
  strokesReceived: number;
  netStrokes: number | null;
  points: number;
}

export interface StablefordPlayerResult {
  roundParticipantId: string;
  displayName: string;
  playingHandicap: number;
  holeScores: StablefordHoleScore[];
  totalPoints: number;
  /** Gross total strokes (null holes counted as 0) */
  grossTotal: number;
  /** Net total strokes */
  netTotal: number;
  /** Number of holes with a score entered */
  holesCompleted: number;
  rank: number;
}

export interface StablefordResult {
  leaderboard: StablefordPlayerResult[];
}

// ──────────────────────────────────────────────
// Core: Calculate stableford points for a single hole
// ──────────────────────────────────────────────

export function stablefordPoints(
  grossStrokes: number,
  par: number,
  strokesReceived: number,
): number {
  const netStrokes = grossStrokes - strokesReceived;
  const diff = netStrokes - par; // positive = over par
  // Standard stableford: 2 - diff, min 0
  return Math.max(0, 2 - diff);
}

// ──────────────────────────────────────────────
// Build a score lookup: (participantId, holeNumber) → strokes
// ──────────────────────────────────────────────

export function buildScoreLookup(scores: ResolvedScore[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of scores) {
    map.set(`${s.roundParticipantId}:${s.holeNumber}`, s.strokes);
  }
  return map;
}

// ──────────────────────────────────────────────
// Calculate stableford for all participants
// ──────────────────────────────────────────────

export function calculateStableford(
  input: CompetitionInput,
  config: { countBack: boolean },
): StablefordResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const holesByNumber = new Map<number, HoleData>();
  for (const h of input.holes) {
    holesByNumber.set(h.holeNumber, h);
  }

  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const playerResults: StablefordPlayerResult[] = input.participants.map(
    (p) => {
      let totalPoints = 0;
      let grossTotal = 0;
      let netTotal = 0;
      let holesCompleted = 0;

      const holeScores: StablefordHoleScore[] = sortedHoles.map((hole) => {
        const key = `${p.roundParticipantId}:${hole.holeNumber}`;
        const grossStrokes = scoreLookup.get(key) ?? null;
        const strokesReceived = getStrokesOnHole(
          p.playingHandicap,
          hole.strokeIndex,
        );

        let points = 0;
        let netStrokes: number | null = null;
        if (grossStrokes !== null) {
          points = stablefordPoints(grossStrokes, hole.par, strokesReceived);
          netStrokes = grossStrokes - strokesReceived;
          totalPoints += points;
          grossTotal += grossStrokes;
          netTotal += netStrokes;
          holesCompleted++;
        }

        return {
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          grossStrokes,
          strokesReceived,
          netStrokes,
          points,
        };
      });

      return {
        roundParticipantId: p.roundParticipantId,
        displayName: p.displayName,
        playingHandicap: p.playingHandicap,
        holeScores,
        totalPoints,
        grossTotal,
        netTotal,
        holesCompleted,
        rank: 0, // set after sorting
      };
    },
  );

  // Sort by total points (descending), then count-back if enabled
  playerResults.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (config.countBack) {
      return countBackCompare(a, b, sortedHoles);
    }
    return 0;
  });

  // Assign ranks (handle ties)
  let rank = 1;
  for (let i = 0; i < playerResults.length; i++) {
    if (i > 0) {
      const prev = playerResults[i - 1];
      const curr = playerResults[i];
      if (curr.totalPoints < prev.totalPoints) {
        rank = i + 1;
      } else if (config.countBack) {
        // If count-back resolved the tie, different rank
        if (countBackCompare(prev, curr, sortedHoles) !== 0) {
          rank = i + 1;
        }
      }
    }
    playerResults[i].rank = rank;
  }

  return { leaderboard: playerResults };
}

// ──────────────────────────────────────────────
// Count-back tiebreaker
// Compare stableford points over last 9, last 6, last 3, last 1 holes
// ──────────────────────────────────────────────

function countBackCompare(
  a: StablefordPlayerResult,
  b: StablefordPlayerResult,
  sortedHoles: HoleData[],
): number {
  const totalHoles = sortedHoles.length;
  const windows = [
    Math.ceil(totalHoles / 2), // last 9 (for 18 holes)
    Math.ceil(totalHoles / 3), // last 6
    Math.ceil(totalHoles / 6), // last 3
    1, // last hole
  ];

  for (const windowSize of windows) {
    const startIdx = totalHoles - windowSize;
    let aPoints = 0;
    let bPoints = 0;
    for (let i = startIdx; i < totalHoles; i++) {
      aPoints += a.holeScores[i]?.points ?? 0;
      bPoints += b.holeScores[i]?.points ?? 0;
    }
    if (bPoints !== aPoints) return bPoints - aPoints;
  }

  return 0; // truly tied
}
