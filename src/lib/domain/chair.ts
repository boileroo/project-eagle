// ──────────────────────────────────────────────
// Chair Scoring Engine
//
// Pure functions. No DB access.
// Game format: 4 players per group (within_group).
//
// Rules:
//   - Win a hole outright (best net stableford, no tie) → take the chair.
//   - Tie on a hole → chair holder retains.
//   - If no chair holder yet and the first hole is tied → no point awarded.
//   - 1 point awarded per hole the chair is held at end of each hole.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import { assignRanks } from './rank';
import type { CompetitionInput } from './index';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ChairHoleResult {
  holeNumber: number;
  playerStableford: { roundParticipantId: string; stableford: number }[];
  /** null = no change / still vacant; string = playerId who took the chair */
  chairTakenBy: string | null;
  /** The chair holder after this hole (null if no one has won yet) */
  chairHolderId: string | null;
  /** 1 point earned by chair holder this hole (0 if no holder) */
  pointEarned: boolean;
}

export interface ChairPlayerResult {
  roundParticipantId: string;
  displayName: string;
  holeResults: ChairHoleResult[];
  totalPoints: number;
  holesCompleted: number;
  rank: number;
}

export interface ChairResult {
  leaderboard: ChairPlayerResult[];
}

// ──────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────

/**
 * Calculates chair (musical chairs) scores for a 4-player competition group.
 *
 * One player starts as the "chair holder". On each hole, the player with the
 * highest stableford score takes the chair. If the chair holder has the best
 * (or tied best) score, they earn a point and retain the chair. If another
 * player has the best score, they take the chair (no point is earned that hole).
 * Ties for best score result in no chair transfer and no point earned.
 *
 * @throws {Error} If the input does not contain exactly 4 participants.
 */
export function calculateChair(input: CompetitionInput): ChairResult {
  if (input.participants.length !== 4) {
    throw new Error(
      `Chair requires exactly 4 players per group, got ${input.participants.length}`,
    );
  }
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const participants = input.participants;

  // Per-player accumulators
  const playerPoints = new Map<string, number>();
  const playerHolesCompleted = new Map<string, number>();
  const playerHoleResults = new Map<string, ChairHoleResult[]>();

  for (const p of participants) {
    playerPoints.set(p.roundParticipantId, 0);
    playerHolesCompleted.set(p.roundParticipantId, 0);
    playerHoleResults.set(p.roundParticipantId, []);
  }

  let chairHolderId: string | null = null;

  for (const hole of sortedHoles) {
    // All participants need a score for this hole
    const allScored = participants.every((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );

    if (!allScored) {
      // Record unscored hole for all participants
      const holeResult: ChairHoleResult = {
        holeNumber: hole.holeNumber,
        playerStableford: participants.map((p) => ({
          roundParticipantId: p.roundParticipantId,
          stableford: 0,
        })),
        chairTakenBy: null,
        chairHolderId,
        pointEarned: false,
      };
      for (const p of participants) {
        playerHoleResults.get(p.roundParticipantId)!.push(holeResult);
      }
      continue;
    }

    // Calculate stableford per player
    const playerStableford = participants.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key)!;
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        stableford: stablefordPoints(strokes, hole.par, received),
      };
    });

    // Find best stableford
    const maxStableford = Math.max(
      ...playerStableford.map((ps) => ps.stableford),
    );
    const winners = playerStableford.filter(
      (ps) => ps.stableford === maxStableford,
    );

    let chairTakenBy: string | null = null;

    if (winners.length === 1) {
      // Outright winner takes the chair
      const newHolder = winners[0].roundParticipantId;
      if (newHolder !== chairHolderId) {
        chairTakenBy = newHolder;
        chairHolderId = newHolder;
      }
      // else same player holds — no "taken" event
    }
    // If tie: chair holder retains (chairHolderId unchanged)

    // Award point to chair holder
    const pointEarned = chairHolderId !== null;
    if (chairHolderId !== null) {
      playerPoints.set(
        chairHolderId,
        (playerPoints.get(chairHolderId) ?? 0) + 1,
      );
    }

    // Increment holesCompleted for all players
    for (const p of participants) {
      playerHolesCompleted.set(
        p.roundParticipantId,
        (playerHolesCompleted.get(p.roundParticipantId) ?? 0) + 1,
      );
    }

    const holeResult: ChairHoleResult = {
      holeNumber: hole.holeNumber,
      playerStableford,
      chairTakenBy,
      chairHolderId,
      pointEarned,
    };

    for (const p of participants) {
      playerHoleResults.get(p.roundParticipantId)!.push(holeResult);
    }
  }

  // Build leaderboard
  const leaderboard: ChairPlayerResult[] = participants.map((p) => ({
    roundParticipantId: p.roundParticipantId,
    displayName: p.displayName,
    holeResults: playerHoleResults.get(p.roundParticipantId) ?? [],
    totalPoints: playerPoints.get(p.roundParticipantId) ?? 0,
    holesCompleted: playerHolesCompleted.get(p.roundParticipantId) ?? 0,
    rank: 0,
  }));

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  assignRanks(leaderboard, (p) => p.totalPoints);

  return { leaderboard };
}
