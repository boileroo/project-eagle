// ──────────────────────────────────────────────
// Stroke Play Scoring Engine
//
// Pure functions. No DB access.
// Supports gross and net stroke play.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import type { CompetitionInput } from './index';
import { buildScoreLookup } from './stableford';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface StrokePlayHoleScore {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossStrokes: number | null;
  strokesReceived: number;
  netStrokes: number | null;
}

export interface StrokePlayPlayerResult {
  roundParticipantId: string;
  displayName: string;
  playingHandicap: number;
  holeScores: StrokePlayHoleScore[];
  grossTotal: number;
  netTotal: number;
  /** The score used for ranking (gross or net depending on config) */
  rankingScore: number;
  /** Relative to par (e.g. +3, -1) */
  relativeToPar: number;
  holesCompleted: number;
  rank: number;
}

export interface StrokePlayResult {
  scoringBasis: 'gross_strokes' | 'net_strokes';
  leaderboard: StrokePlayPlayerResult[];
}

// ──────────────────────────────────────────────
// Calculate stroke play for all participants
// ──────────────────────────────────────────────

export function calculateStrokePlay(
  input: CompetitionInput,
  config: { scoringBasis: 'gross_strokes' | 'net_strokes' },
): StrokePlayResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const totalPar = sortedHoles.reduce((sum, h) => sum + h.par, 0);

  const playerResults: StrokePlayPlayerResult[] = input.participants.map(
    (p) => {
      let grossTotal = 0;
      let netTotal = 0;
      let holesCompleted = 0;

      const holeScores: StrokePlayHoleScore[] = sortedHoles.map((hole) => {
        const key = `${p.roundParticipantId}:${hole.holeNumber}`;
        const grossStrokes = scoreLookup.get(key) ?? null;
        const strokesReceived = getStrokesOnHole(
          p.playingHandicap,
          hole.strokeIndex,
        );

        let netStrokes: number | null = null;
        if (grossStrokes !== null) {
          netStrokes = grossStrokes - strokesReceived;
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
        };
      });

      const rankingScore =
        config.scoringBasis === 'gross_strokes' ? grossTotal : netTotal;
      const relativeToPar = rankingScore - totalPar;

      return {
        roundParticipantId: p.roundParticipantId,
        displayName: p.displayName,
        playingHandicap: p.playingHandicap,
        holeScores,
        grossTotal,
        netTotal,
        rankingScore,
        relativeToPar,
        holesCompleted,
        rank: 0,
      };
    },
  );

  // Sort by ranking score ascending (lower is better in stroke play)
  playerResults.sort((a, b) => {
    if (a.rankingScore !== b.rankingScore)
      return a.rankingScore - b.rankingScore;
    return 0;
  });

  // Assign ranks (handle ties)
  let rank = 1;
  for (let i = 0; i < playerResults.length; i++) {
    if (
      i > 0 &&
      playerResults[i].rankingScore !== playerResults[i - 1].rankingScore
    ) {
      rank = i + 1;
    }
    playerResults[i].rank = rank;
  }

  return {
    scoringBasis: config.scoringBasis,
    leaderboard: playerResults,
  };
}
