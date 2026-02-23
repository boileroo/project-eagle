// ──────────────────────────────────────────────
// Hi-Lo Scoring Engine
//
// Pure functions. No DB access.
// Match format: 2v2 within each group.
// Per hole: two sub-matches are played simultaneously:
//   - High ball: best stableford from each side (winner of high ball scores)
//   - Low ball:  worst stableford from each side (winner of low ball scores)
// 2 points available per hole (1 per sub-match).
// Ties on either ball earn pointsPerHalf.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import type { CompetitionInput, HoleData, ParticipantData } from './index';
import type { HiLoConfig } from '../competitions';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface HiLoHoleResult {
  holeNumber: number;
  teamAPlayerPoints: { roundParticipantId: string; points: number }[];
  teamBPlayerPoints: { roundParticipantId: string; points: number }[];
  /** High ball sub-match */
  highBall: {
    teamABest: number;
    teamBBest: number;
    winner: 'A' | 'B' | 'halved';
    pointsA: number;
    pointsB: number;
  };
  /** Low ball sub-match */
  lowBall: {
    teamAWorst: number;
    teamBWorst: number;
    winner: 'A' | 'B' | 'halved';
    pointsA: number;
    pointsB: number;
  };
  holePointsA: number;
  holePointsB: number;
}

export interface HiLoMatchResult {
  teamA: { teamId: string; name: string };
  teamB: { teamId: string; name: string };
  teamAPlayers: { roundParticipantId: string; displayName: string }[];
  teamBPlayers: { roundParticipantId: string; displayName: string }[];
  holeResults: HiLoHoleResult[];
  totalPointsA: number;
  totalPointsB: number;
  holesCompleted: number;
  totalHoles: number;
  resultText: string;
  winner: 'A' | 'B' | 'halved' | null;
  pointsA: number;
  pointsB: number;
  groupId?: string;
  groupName?: string | null;
}

export interface HiLoResult {
  matches: HiLoMatchResult[];
}

// ──────────────────────────────────────────────
// Sub-match helper
// ──────────────────────────────────────────────

function subMatchResult(
  scoreA: number,
  scoreB: number,
  pointsPerWin: number,
  pointsPerHalf: number,
): { winner: 'A' | 'B' | 'halved'; pointsA: number; pointsB: number } {
  if (scoreA > scoreB) {
    return { winner: 'A', pointsA: pointsPerWin, pointsB: 0 };
  } else if (scoreB > scoreA) {
    return { winner: 'B', pointsA: 0, pointsB: pointsPerWin };
  }
  return { winner: 'halved', pointsA: pointsPerHalf, pointsB: pointsPerHalf };
}

// ──────────────────────────────────────────────
// Single Hi-Lo match
// ──────────────────────────────────────────────

function calculateHiLoMatch(
  teamAInfo: { teamId: string; name: string },
  teamAMembers: ParticipantData[],
  teamBInfo: { teamId: string; name: string },
  teamBMembers: ParticipantData[],
  holes: HoleData[],
  scoreLookup: Map<string, number>,
  pointsPerWin: number,
  pointsPerHalf: number,
): HiLoMatchResult {
  const sortedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const holeResults: HiLoHoleResult[] = [];
  let totalPointsA = 0;
  let totalPointsB = 0;
  let holesCompleted = 0;

  for (const hole of sortedHoles) {
    const teamAHasScore = teamAMembers.every((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );
    const teamBHasScore = teamBMembers.every((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );

    if (!teamAHasScore || !teamBHasScore) continue;

    const teamAPlayerPoints = teamAMembers.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key)!;
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        points: stablefordPoints(strokes, hole.par, received),
      };
    });

    const teamBPlayerPoints = teamBMembers.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key)!;
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        points: stablefordPoints(strokes, hole.par, received),
      };
    });

    const aPoints = teamAPlayerPoints.map((p) => p.points);
    const bPoints = teamBPlayerPoints.map((p) => p.points);

    const teamABest = Math.max(...aPoints);
    const teamBBest = Math.max(...bPoints);
    const teamAWorst = Math.min(...aPoints);
    const teamBWorst = Math.min(...bPoints);

    const highBall = subMatchResult(
      teamABest,
      teamBBest,
      pointsPerWin,
      pointsPerHalf,
    );
    const lowBall = subMatchResult(
      teamAWorst,
      teamBWorst,
      pointsPerWin,
      pointsPerHalf,
    );

    const holePointsA = highBall.pointsA + lowBall.pointsA;
    const holePointsB = highBall.pointsB + lowBall.pointsB;

    totalPointsA += holePointsA;
    totalPointsB += holePointsB;
    holesCompleted++;

    holeResults.push({
      holeNumber: hole.holeNumber,
      teamAPlayerPoints,
      teamBPlayerPoints,
      highBall: {
        teamABest,
        teamBBest,
        ...highBall,
      },
      lowBall: {
        teamAWorst,
        teamBWorst,
        ...lowBall,
      },
      holePointsA,
      holePointsB,
    });
  }

  const isComplete = holesCompleted === sortedHoles.length;

  let winner: 'A' | 'B' | 'halved' | null = null;
  let pointsA = 0;
  let pointsB = 0;
  let resultText: string;

  if (isComplete || holesCompleted > 0) {
    if (totalPointsA > totalPointsB) {
      winner = 'A';
      pointsA = pointsPerWin;
      resultText = `${teamAInfo.name} wins ${totalPointsA}–${totalPointsB}`;
    } else if (totalPointsB > totalPointsA) {
      winner = 'B';
      pointsB = pointsPerWin;
      resultText = `${teamBInfo.name} wins ${totalPointsB}–${totalPointsA}`;
    } else {
      winner = isComplete ? 'halved' : null;
      if (isComplete) {
        pointsA = pointsPerHalf;
        pointsB = pointsPerHalf;
      }
      resultText =
        totalPointsA === 0 && totalPointsB === 0
          ? 'Not started'
          : `All Square ${totalPointsA}–${totalPointsB}`;
    }
  } else {
    resultText = 'Not started';
  }

  // Suppress winner if match is still in progress
  if (!isComplete && winner !== null) {
    winner = null;
    pointsA = 0;
    pointsB = 0;
  }

  return {
    teamA: teamAInfo,
    teamB: teamBInfo,
    teamAPlayers: teamAMembers.map((p) => ({
      roundParticipantId: p.roundParticipantId,
      displayName: p.displayName,
    })),
    teamBPlayers: teamBMembers.map((p) => ({
      roundParticipantId: p.roundParticipantId,
      displayName: p.displayName,
    })),
    holeResults,
    totalPointsA,
    totalPointsB,
    holesCompleted,
    totalHoles: sortedHoles.length,
    resultText,
    winner,
    pointsA,
    pointsB,
  };
}

// ──────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────

export function calculateHiLo(
  input: CompetitionInput,
  config: HiLoConfig['config'],
): HiLoResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const teams = input.teams ?? [];
  const participantMap = new Map(
    input.participants.map((p) => [p.roundParticipantId, p]),
  );
  const teamMap = new Map(teams.map((t) => [t.teamId, t]));

  // Within-group: each group has exactly 2 teams × 2 players
  // Pairings are determined by which team each participant belongs to
  const groups = input.groups ?? [];
  const matches: HiLoMatchResult[] = [];

  for (const group of groups) {
    const members = group.memberParticipantIds
      .map((id) => participantMap.get(id))
      .filter(Boolean) as ParticipantData[];

    if (members.length < 4) continue;

    // Split by team
    const teamSplits = new Map<string, ParticipantData[]>();
    for (const member of members) {
      const team = teams.find((t) =>
        t.memberParticipantIds.includes(member.roundParticipantId),
      );
      if (!team) continue;
      if (!teamSplits.has(team.teamId)) teamSplits.set(team.teamId, []);
      teamSplits.get(team.teamId)!.push(member);
    }

    const teamIds = [...teamSplits.keys()];
    if (teamIds.length < 2) continue;

    const teamAId = teamIds[0];
    const teamBId = teamIds[1];
    const teamAData = teamMap.get(teamAId);
    const teamBData = teamMap.get(teamBId);
    if (!teamAData || !teamBData) continue;

    const teamAMembers = teamSplits.get(teamAId)!;
    const teamBMembers = teamSplits.get(teamBId)!;

    matches.push(
      calculateHiLoMatch(
        { teamId: teamAId, name: teamAData.name },
        teamAMembers,
        { teamId: teamBId, name: teamBData.name },
        teamBMembers,
        input.holes,
        scoreLookup,
        config.pointsPerWin,
        config.pointsPerHalf,
      ),
    );
    matches[matches.length - 1].groupId = group.roundGroupId;
    matches[matches.length - 1].groupName = group.name;
  }

  return { matches };
}
