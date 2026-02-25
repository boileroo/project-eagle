// ──────────────────────────────────────────────
// Wolf Scoring Engine
//
// Pure functions. No DB access.
// Game format: 4 players per group (within_group).
//
// Wolf rotation:
//   - Player order is determined by the order of `input.participants`
//     (caller must pass in group position order).
//   - Player 1 is wolf on holes 1, 5, 9, 13, 17
//   - Player 2 is wolf on holes 2, 6, 10, 14, 18
//   - Player 3 is wolf on holes 3, 7, 11, 15
//   - Player 4 is wolf on holes 4, 8, 12, 16
//
// Points (standard 2/4/2):
//   - Wolf + partner win → 2 pts each (opposing 2 get 0)
//   - Lone wolf wins → 4 pts (opposing 3 get 0)
//   - Lone wolf loses → 0 pts for wolf, 2 pts each to other 3
//   - Ties on any configuration → no points awarded for that hole
//
// Win/loss determination: best stableford from each side.
//   Wolf side: wolf + partner (or just wolf if lone)
//   Opposing side: the other 2 (or 3) players
//
// Decisions are stored in gameDecisions (latest per holeNumber).
// If no decision exists for a hole, wolf is treated as lone wolf.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import { assignRanks } from './rank';
import type { CompetitionInput, GameDecisionData } from './index';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface WolfHoleResult {
  holeNumber: number;
  wolfPlayerId: string;
  partnerPlayerId: string | null;
  isLoneWolf: boolean;
  playerStableford: { roundParticipantId: string; stableford: number }[];
  wolfSideBest: number;
  opposingSideBest: number;
  outcome: 'wolf_wins' | 'wolf_loses' | 'tie' | 'not_played';
  pointsAwarded: { roundParticipantId: string; points: number }[];
}

export interface WolfPlayerResult {
  roundParticipantId: string;
  displayName: string;
  /** 1-indexed position in rotation */
  rotationPosition: number;
  holeResults: WolfHoleResult[];
  totalPoints: number;
  holesCompleted: number;
  rank: number;
}

export interface WolfResult {
  leaderboard: WolfPlayerResult[];
}

// ──────────────────────────────────────────────
// Wolf rotation: which player index (0-based) is wolf on a given hole
// ──────────────────────────────────────────────

function wolfIndexForHole(holeNumber: number, playerCount: number): number {
  // hole 1 → index 0, hole 2 → index 1, ...
  return (holeNumber - 1) % playerCount;
}

// ──────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────

/**
 * Calculates wolf scores for a competition.
 *
 * Wolf is a 4-player per group game. On each hole the "wolf" (rotating by
 * hole number) may choose a partner or go lone wolf. The wolf side wins if
 * their best stableford beats the opposing side's best. Points are fixed
 * (4 for lone wolf win, 2 per player for partnered win; opponents receive
 * 2 each when the lone wolf loses). Ties award no points.
 *
 * @param gameDecisions - Player decisions (partner selections) per hole.
 */
export function calculateWolf(
  input: CompetitionInput,
  gameDecisions: GameDecisionData[],
): WolfResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const players = input.participants; // order = rotation order
  const n = players.length;

  // Build latest decision per hole
  const decisionMap = new Map<number, GameDecisionData['data']>();
  for (const d of gameDecisions) {
    // Last entry wins (caller should already provide deduplicated list,
    // but we respect ordering anyway)
    decisionMap.set(d.holeNumber, d.data);
  }

  // Per-player accumulators
  const playerPoints = new Map<string, number>();
  const playerHolesCompleted = new Map<string, number>();
  const playerHoleResults = new Map<string, WolfHoleResult[]>();

  for (const p of players) {
    playerPoints.set(p.roundParticipantId, 0);
    playerHolesCompleted.set(p.roundParticipantId, 0);
    playerHoleResults.set(p.roundParticipantId, []);
  }

  for (const hole of sortedHoles) {
    const wolfIdx = wolfIndexForHole(hole.holeNumber, n);
    const wolf = players[wolfIdx];

    const decision = decisionMap.get(hole.holeNumber);
    const partnerPlayerId = decision?.partnerPlayerId ?? null;

    // Validate partner is in this group
    const validPartner =
      partnerPlayerId !== null &&
      players.some((p) => p.roundParticipantId === partnerPlayerId)
        ? partnerPlayerId
        : null;

    const isLoneWolf = validPartner === null;

    // All players need a score
    const allScored = players.every((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );

    if (!allScored) {
      const holeResult: WolfHoleResult = {
        holeNumber: hole.holeNumber,
        wolfPlayerId: wolf.roundParticipantId,
        partnerPlayerId: validPartner,
        isLoneWolf,
        playerStableford: players.map((p) => ({
          roundParticipantId: p.roundParticipantId,
          stableford: 0,
        })),
        wolfSideBest: 0,
        opposingSideBest: 0,
        outcome: 'not_played',
        pointsAwarded: players.map((p) => ({
          roundParticipantId: p.roundParticipantId,
          points: 0,
        })),
      };
      for (const p of players) {
        playerHoleResults.get(p.roundParticipantId)!.push(holeResult);
      }
      continue;
    }

    // Calculate stableford for each player
    const playerStableford = players.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key)!;
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        stableford: stablefordPoints(strokes, hole.par, received),
      };
    });

    const stablefordMap = new Map(
      playerStableford.map((ps) => [ps.roundParticipantId, ps.stableford]),
    );

    // Determine wolf side and opposing side
    const wolfSideIds = new Set<string>([wolf.roundParticipantId]);
    if (validPartner) wolfSideIds.add(validPartner);

    const wolfSideStableford = [...wolfSideIds].map(
      (id) => stablefordMap.get(id) ?? 0,
    );
    const opposingSideStableford = players
      .filter((p) => !wolfSideIds.has(p.roundParticipantId))
      .map((p) => stablefordMap.get(p.roundParticipantId) ?? 0);

    const wolfSideBest = Math.max(...wolfSideStableford);
    const opposingSideBest = Math.max(...opposingSideStableford);

    let outcome: WolfHoleResult['outcome'];
    if (wolfSideBest > opposingSideBest) {
      outcome = 'wolf_wins';
    } else if (opposingSideBest > wolfSideBest) {
      outcome = 'wolf_loses';
    } else {
      outcome = 'tie';
    }

    // Award points
    const pointsMap = new Map<string, number>(
      players.map((p) => [p.roundParticipantId, 0]),
    );

    if (outcome === 'wolf_wins') {
      if (isLoneWolf) {
        // Lone wolf wins → 4 pts for wolf
        pointsMap.set(wolf.roundParticipantId, 4);
      } else {
        // Wolf + partner win → 2 pts each
        pointsMap.set(wolf.roundParticipantId, 2);
        pointsMap.set(validPartner!, 2);
      }
    } else if (outcome === 'wolf_loses') {
      if (isLoneWolf) {
        // Lone wolf loses → 2 pts each to other 3
        for (const p of players) {
          if (p.roundParticipantId !== wolf.roundParticipantId) {
            pointsMap.set(p.roundParticipantId, 2);
          }
        }
      } else {
        // Wolf + partner lose → 2 pts each to opposing 2
        for (const p of players) {
          if (!wolfSideIds.has(p.roundParticipantId)) {
            pointsMap.set(p.roundParticipantId, 2);
          }
        }
      }
    }
    // tie → no points

    for (const p of players) {
      const pts = pointsMap.get(p.roundParticipantId) ?? 0;
      playerPoints.set(
        p.roundParticipantId,
        (playerPoints.get(p.roundParticipantId) ?? 0) + pts,
      );
      playerHolesCompleted.set(
        p.roundParticipantId,
        (playerHolesCompleted.get(p.roundParticipantId) ?? 0) + 1,
      );
    }

    const holeResult: WolfHoleResult = {
      holeNumber: hole.holeNumber,
      wolfPlayerId: wolf.roundParticipantId,
      partnerPlayerId: validPartner,
      isLoneWolf,
      playerStableford,
      wolfSideBest,
      opposingSideBest,
      outcome,
      pointsAwarded: players.map((p) => ({
        roundParticipantId: p.roundParticipantId,
        points: pointsMap.get(p.roundParticipantId) ?? 0,
      })),
    };

    for (const p of players) {
      playerHoleResults.get(p.roundParticipantId)!.push(holeResult);
    }
  }

  // Build leaderboard
  const leaderboard: WolfPlayerResult[] = players.map((p, idx) => ({
    roundParticipantId: p.roundParticipantId,
    displayName: p.displayName,
    rotationPosition: idx + 1,
    holeResults: playerHoleResults.get(p.roundParticipantId) ?? [],
    totalPoints: playerPoints.get(p.roundParticipantId) ?? 0,
    holesCompleted: playerHolesCompleted.get(p.roundParticipantId) ?? 0,
    rank: 0,
  }));

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
  assignRanks(leaderboard, (p) => p.totalPoints);

  return { leaderboard };
}
