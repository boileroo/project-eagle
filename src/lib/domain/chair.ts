import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import { assignRanks } from './rank';
import type { CompetitionInput } from './index';
import type { ChairConfig } from '../competition-config';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ChairHoleResult {
  holeNumber: number;
  playerScores: { roundParticipantId: string; score: number }[];
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
 * On each hole the player with the best score (determined by `scoringBasis`)
 * takes the chair. If the chair holder has the best (or tied best) score they
 * earn a point and retain the chair. If another player has the outright best
 * score they take the chair (no point is earned that hole). Ties for best score
 * result in no chair transfer and no point earned.
 *
 * Scoring basis:
 *  - `'stableford'` (default): highest stableford points wins the hole
 *  - `'gross'`: lowest gross strokes wins the hole
 *  - `'net'`: lowest net strokes (gross minus handicap strokes received) wins
 *
 * @throws {Error} If the input does not contain exactly 4 participants.
 */
export function calculateChair(
  input: CompetitionInput,
  competitionConfig?: ChairConfig,
): ChairResult {
  if (input.participants.length !== 4) {
    throw new Error(
      `Chair requires exactly 4 players per group, got ${input.participants.length}`,
    );
  }

  const scoringBasis = competitionConfig?.config?.scoringBasis ?? 'stableford';
  const lowerIsBetter = scoringBasis === 'gross' || scoringBasis === 'net';

  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const participants = input.participants;

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
    const allScored = participants.every((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );

    if (!allScored) {
      const holeResult: ChairHoleResult = {
        holeNumber: hole.holeNumber,
        playerScores: participants.map((p) => ({
          roundParticipantId: p.roundParticipantId,
          score: 0,
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

    const playerScores = participants.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key)!;
      const handicapStrokes = getStrokesOnHole(
        p.playingHandicap,
        hole.strokeIndex,
      );
      let score: number;
      if (scoringBasis === 'gross') {
        score = strokes;
      } else if (scoringBasis === 'net') {
        score = strokes - handicapStrokes;
      } else {
        score = stablefordPoints(strokes, hole.par, handicapStrokes);
      }
      return { roundParticipantId: p.roundParticipantId, score };
    });

    const bestScore = lowerIsBetter
      ? Math.min(...playerScores.map((ps) => ps.score))
      : Math.max(...playerScores.map((ps) => ps.score));

    const winners = playerScores.filter((ps) => ps.score === bestScore);

    let chairTakenBy: string | null = null;

    if (winners.length === 1) {
      const newHolder = winners[0].roundParticipantId;
      if (newHolder !== chairHolderId) {
        chairTakenBy = newHolder;
        chairHolderId = newHolder;
      }
    }

    const pointEarned = chairHolderId !== null && chairTakenBy === null;
    if (pointEarned) {
      playerPoints.set(
        chairHolderId!,
        (playerPoints.get(chairHolderId!) ?? 0) + 1,
      );
    }

    for (const p of participants) {
      playerHolesCompleted.set(
        p.roundParticipantId,
        (playerHolesCompleted.get(p.roundParticipantId) ?? 0) + 1,
      );
    }

    const holeResult: ChairHoleResult = {
      holeNumber: hole.holeNumber,
      playerScores,
      chairTakenBy,
      chairHolderId,
      pointEarned,
    };

    for (const p of participants) {
      playerHoleResults.get(p.roundParticipantId)!.push(holeResult);
    }
  }

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
