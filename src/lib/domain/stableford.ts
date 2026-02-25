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

import { assignRanks } from './rank';
import { getStrokesOnHole } from '../handicaps';
import type { CompetitionInput, ResolvedScore } from './index';

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

/**
 * Calculates stableford points for a single hole given net strokes,
 * par, and strokes received from handicap allocation.
 *
 * Points: double bogey or worse → 0, bogey → 1, par → 2,
 * birdie → 3, eagle → 4, albatross → 5.
 */
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

/**
 * Builds a lookup map keyed by `"participantId:holeNumber"` → strokes.
 * Used internally by all scoring engines to avoid nested loops.
 */
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

/**
 * Calculates stableford scores for all participants in a competition,
 * returning a sorted leaderboard with ranks assigned.
 *
 * Uses net scoring (strokes minus handicap allocation per hole).
 */
export function calculateStableford(input: CompetitionInput): StablefordResult {
  const scoreLookup = buildScoreLookup(input.scores);

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

  // Sort by total points (descending)
  playerResults.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return 0;
  });

  // Assign ranks (handle ties)
  assignRanks(playerResults, (p) => p.totalPoints);

  return { leaderboard: playerResults };
}
