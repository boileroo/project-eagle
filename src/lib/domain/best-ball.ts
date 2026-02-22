// ──────────────────────────────────────────────
// Best Ball Scoring Engine
//
// Pure functions. No DB access.
// 2v2 team format: best stableford score from each pair
// compared per hole, head-to-head.
// A halved hole (equal stableford or 0-0) stays halved.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import type { CompetitionInput, HoleData } from './index';
import type { BestBallConfig } from '../competitions';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface BestBallHoleResult {
  holeNumber: number;
  teamABestPoints: number;
  teamBBestPoints: number;
  /** Individual stableford breakdown */
  teamAPlayerPoints: { roundParticipantId: string; points: number }[];
  teamBPlayerPoints: { roundParticipantId: string; points: number }[];
  holeWinner: 'A' | 'B' | 'halved';
}

export interface BestBallMatchResult {
  teamA: { teamId: string; name: string };
  teamB: { teamId: string; name: string };
  holeResults: BestBallHoleResult[];
  /** Positive = A leads, negative = B leads, 0 = all square */
  matchScore: number;
  holesCompleted: number;
  totalHoles: number;
  isDecided: boolean;
  resultText: string;
  winner: 'A' | 'B' | 'halved' | null;
  pointsA: number;
  pointsB: number;
}

export interface BestBallResult {
  matches: BestBallMatchResult[];
}

// ──────────────────────────────────────────────
// Calculate best ball for all team pairings
// ──────────────────────────────────────────────

export function calculateBestBall(
  input: CompetitionInput,
  config: BestBallConfig['config'],
): BestBallResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const teamMap = new Map((input.teams ?? []).map((t) => [t.teamId, t]));
  const participantMap = new Map(
    input.participants.map((p) => [p.roundParticipantId, p]),
  );

  const matches: BestBallMatchResult[] = config.pairings.map((pairing) => {
    const teamA = teamMap.get(pairing.teamA);
    const teamB = teamMap.get(pairing.teamB);
    if (!teamA || !teamB) {
      throw new Error('Best ball pairing references unknown team(s)');
    }

    const teamAMembers = teamA.memberParticipantIds
      .map((id) => participantMap.get(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof participantMap.get>>[];
    const teamBMembers = teamB.memberParticipantIds
      .map((id) => participantMap.get(id))
      .filter(Boolean) as NonNullable<ReturnType<typeof participantMap.get>>[];

    return calculateBestBallMatch(
      { teamId: teamA.teamId, name: teamA.name },
      teamAMembers,
      { teamId: teamB.teamId, name: teamB.name },
      teamBMembers,
      sortedHoles,
      scoreLookup,
      config.pointsPerWin,
      config.pointsPerHalf,
    );
  });

  return { matches };
}

// ──────────────────────────────────────────────
// Calculate a single best ball match
// ──────────────────────────────────────────────

interface TeamInfo {
  teamId: string;
  name: string;
}

interface PlayerInfo {
  roundParticipantId: string;
  displayName: string;
  playingHandicap: number;
}

function calculateBestBallMatch(
  teamAInfo: TeamInfo,
  teamAMembers: PlayerInfo[],
  teamBInfo: TeamInfo,
  teamBMembers: PlayerInfo[],
  holes: HoleData[],
  scoreLookup: Map<string, number>,
  pointsPerWin: number,
  pointsPerHalf: number,
): BestBallMatchResult {
  const totalHoles = holes.length;
  const holeResults: BestBallHoleResult[] = [];
  let matchScore = 0;
  let holesCompleted = 0;
  let decidedAt: number | null = null;

  for (const hole of holes) {
    if (teamAMembers.length === 0 || teamBMembers.length === 0) {
      continue;
    }

    // Calculate stableford points for each team member on this hole
    const teamAPlayerPoints = teamAMembers.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key);
      if (strokes === undefined)
        return { roundParticipantId: p.roundParticipantId, points: 0 };
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        points: stablefordPoints(strokes, hole.par, received),
      };
    });

    const teamBPlayerPoints = teamBMembers.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key);
      if (strokes === undefined)
        return { roundParticipantId: p.roundParticipantId, points: 0 };
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        points: stablefordPoints(strokes, hole.par, received),
      };
    });

    // Best (highest) stableford from each team
    const teamABest = Math.max(...teamAPlayerPoints.map((p) => p.points));
    const teamBBest = Math.max(...teamBPlayerPoints.map((p) => p.points));

    // Check if at least one player from each team has actually scored
    const teamAHasScore = teamAMembers.some((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );
    const teamBHasScore = teamBMembers.some((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );

    if (!teamAHasScore || !teamBHasScore) {
      continue; // Skip holes where either team has no scores
    }

    holesCompleted++;

    let holeWinner: 'A' | 'B' | 'halved';
    if (teamABest > teamBBest) {
      holeWinner = 'A';
      matchScore++;
    } else if (teamBBest > teamABest) {
      holeWinner = 'B';
      matchScore--;
    } else {
      holeWinner = 'halved';
    }

    holeResults.push({
      holeNumber: hole.holeNumber,
      teamABestPoints: teamABest,
      teamBBestPoints: teamBBest,
      teamAPlayerPoints,
      teamBPlayerPoints,
      holeWinner,
    });

    // Check if match is decided
    const holesRemaining = totalHoles - holesCompleted;
    if (decidedAt === null && Math.abs(matchScore) > holesRemaining) {
      decidedAt = holesCompleted;
    }
  }

  // Determine result (same logic as match play)
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
        resultText = `${teamAInfo.name} wins ${matchScore}&${holesRemaining}`;
      } else {
        resultText = `${teamAInfo.name} wins ${matchScore} UP`;
      }
    } else if (matchScore < 0) {
      winner = 'B';
      pointsB = pointsPerWin;
      const absScore = Math.abs(matchScore);
      const holesRemaining = totalHoles - (decidedAt ?? totalHoles);
      if (holesRemaining > 0) {
        resultText = `${teamBInfo.name} wins ${absScore}&${holesRemaining}`;
      } else {
        resultText = `${teamBInfo.name} wins ${absScore} UP`;
      }
    } else {
      winner = 'halved';
      pointsA = pointsPerHalf;
      pointsB = pointsPerHalf;
      resultText = 'All Square';
    }
  } else {
    if (matchScore > 0) {
      resultText = `${teamAInfo.name} ${matchScore} UP`;
    } else if (matchScore < 0) {
      resultText = `${teamBInfo.name} ${Math.abs(matchScore)} UP`;
    } else {
      resultText = 'All Square';
    }
  }

  return {
    teamA: teamAInfo,
    teamB: teamBInfo,
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
