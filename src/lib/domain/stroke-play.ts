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

/**
 * Calculates stroke play scores for all participants, returning a leaderboard
 * sorted by lowest ranking score (gross or net strokes depending on config).
 *
 * Participants with no scores are sorted to the bottom and left unranked.
 * Ties are handled with standard competition ranking (1, 2, 2, 4).
 */
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
  // Participants with no scores are pushed to the bottom.
  playerResults.sort((a, b) => {
    const aNoScores = a.holesCompleted === 0;
    const bNoScores = b.holesCompleted === 0;

    if (aNoScores && bNoScores) return 0;
    if (aNoScores) return 1;
    if (bNoScores) return -1;

    if (a.rankingScore !== b.rankingScore)
      return a.rankingScore - b.rankingScore;
    return 0;
  });

  // Assign ranks (handle ties). Players with no scores remain unranked.
  let rank = 1;
  for (let i = 0; i < playerResults.length; i++) {
    if (playerResults[i].holesCompleted === 0) continue;

    if (
      i > 0 &&
      playerResults[i - 1].holesCompleted > 0 &&
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
