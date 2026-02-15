// ──────────────────────────────────────────────
// Match Play Scoring Engine
//
// Pure functions. No DB access.
// Head-to-head using stableford points per hole.
// A halved hole (equal stableford or 0-0) stays halved.
// Match declared at point of winning (e.g. 3&2)
// but scores may continue for individual comps.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import type { CompetitionInput, HoleData } from './index';
import type { MatchPlayConfig } from '../competitions';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface MatchHoleResult {
  holeNumber: number;
  playerAPoints: number;
  playerBPoints: number;
  /** 'A' | 'B' | 'halved' */
  holeWinner: 'A' | 'B' | 'halved';
}

export interface MatchResult {
  playerA: { roundParticipantId: string; displayName: string };
  playerB: { roundParticipantId: string; displayName: string };
  holeResults: MatchHoleResult[];
  /**
   * Running match status after each completed hole.
   * Positive = A leads, negative = B leads, 0 = all square.
   */
  matchScore: number;
  /** Number of holes completed (both players have scores) */
  holesCompleted: number;
  /** Total holes in the round */
  totalHoles: number;
  /** Is the match decided (one player can't be caught)? */
  isDecided: boolean;
  /**
   * Match result string, e.g.:
   *   "Player A wins 3&2"
   *   "All Square"
   *   "Player A 2 UP" (in progress)
   */
  resultText: string;
  /** Who won: 'A' | 'B' | 'halved' | null (in progress) */
  winner: 'A' | 'B' | 'halved' | null;
  /** Points awarded to each side */
  pointsA: number;
  pointsB: number;
}

export interface MatchPlayResult {
  matches: MatchResult[];
}

// ──────────────────────────────────────────────
// Calculate match play for all pairings
// ──────────────────────────────────────────────

export function calculateMatchPlay(
  input: CompetitionInput,
  config: MatchPlayConfig['config'],
): MatchPlayResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );
  const participantMap = new Map(
    input.participants.map((p) => [p.roundParticipantId, p]),
  );

  const matches: MatchResult[] = config.pairings.map((pairing) => {
    const pA = participantMap.get(pairing.playerA);
    const pB = participantMap.get(pairing.playerB);
    if (!pA || !pB) {
      throw new Error(`Match play pairing references unknown participant(s)`);
    }

    return calculateMatch(
      pA.roundParticipantId,
      pA.displayName,
      pA.playingHandicap,
      pB.roundParticipantId,
      pB.displayName,
      pB.playingHandicap,
      sortedHoles,
      scoreLookup,
      config.pointsPerWin,
      config.pointsPerHalf,
    );
  });

  return { matches };
}

// ──────────────────────────────────────────────
// Calculate a single match between two players
// ──────────────────────────────────────────────

export function calculateMatch(
  playerAId: string,
  playerAName: string,
  playerAHC: number,
  playerBId: string,
  playerBName: string,
  playerBHC: number,
  holes: HoleData[],
  scoreLookup: Map<string, number>,
  pointsPerWin: number,
  pointsPerHalf: number,
): MatchResult {
  const totalHoles = holes.length;
  const holeResults: MatchHoleResult[] = [];
  let matchScore = 0; // positive = A leads
  let holesCompleted = 0;
  let decidedAt: number | null = null;

  for (const hole of holes) {
    const aKey = `${playerAId}:${hole.holeNumber}`;
    const bKey = `${playerBId}:${hole.holeNumber}`;
    const aStrokes = scoreLookup.get(aKey);
    const bStrokes = scoreLookup.get(bKey);

    // Both players need a score for the hole to count
    if (aStrokes === undefined || bStrokes === undefined) {
      continue;
    }

    const aReceived = getStrokesOnHole(playerAHC, hole.strokeIndex);
    const bReceived = getStrokesOnHole(playerBHC, hole.strokeIndex);
    const aPoints = stablefordPoints(aStrokes, hole.par, aReceived);
    const bPoints = stablefordPoints(bStrokes, hole.par, bReceived);

    let holeWinner: 'A' | 'B' | 'halved';
    if (aPoints > bPoints) {
      holeWinner = 'A';
      matchScore++;
    } else if (bPoints > aPoints) {
      holeWinner = 'B';
      matchScore--;
    } else {
      holeWinner = 'halved';
    }

    holesCompleted++;

    holeResults.push({
      holeNumber: hole.holeNumber,
      playerAPoints: aPoints,
      playerBPoints: bPoints,
      holeWinner,
    });

    // Check if match is decided
    const holesRemaining = totalHoles - holesCompleted;
    if (decidedAt === null && Math.abs(matchScore) > holesRemaining) {
      decidedAt = holesCompleted;
    }
  }

  // Determine result
  const isDecided = decidedAt !== null || holesCompleted === totalHoles;
  let winner: 'A' | 'B' | 'halved' | null = null;
  let resultText: string;
  let pointsA = 0;
  let pointsB = 0;

  if (isDecided) {
    if (matchScore > 0) {
      winner = 'A';
      pointsA = pointsPerWin;
      const holesRemaining = totalHoles - (decidedAt ?? totalHoles);
      if (holesRemaining > 0) {
        resultText = `${playerAName} wins ${matchScore}&${holesRemaining}`;
      } else {
        resultText = `${playerAName} wins ${matchScore} UP`;
      }
    } else if (matchScore < 0) {
      winner = 'B';
      pointsB = pointsPerWin;
      const absScore = Math.abs(matchScore);
      const holesRemaining = totalHoles - (decidedAt ?? totalHoles);
      if (holesRemaining > 0) {
        resultText = `${playerBName} wins ${absScore}&${holesRemaining}`;
      } else {
        resultText = `${playerBName} wins ${absScore} UP`;
      }
    } else {
      winner = 'halved';
      pointsA = pointsPerHalf;
      pointsB = pointsPerHalf;
      resultText = 'All Square';
    }
  } else {
    // In progress
    if (matchScore > 0) {
      resultText = `${playerAName} ${matchScore} UP`;
    } else if (matchScore < 0) {
      resultText = `${playerBName} ${Math.abs(matchScore)} UP`;
    } else {
      resultText = 'All Square';
    }
  }

  return {
    playerA: { roundParticipantId: playerAId, displayName: playerAName },
    playerB: { roundParticipantId: playerBId, displayName: playerBName },
    holeResults,
    matchScore,
    holesCompleted,
    totalHoles,
    isDecided,
    resultText,
    winner,
    pointsA,
    pointsB,
  };
}
