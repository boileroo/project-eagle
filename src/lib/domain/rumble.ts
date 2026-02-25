// ──────────────────────────────────────────────
// Rumble Scoring Engine
//
// Pure functions. No DB access.
// Match format: all 4-player groups, all same team.
// Hole scoring:
//   Holes 1–6:   best 1 stableford from the group
//   Holes 7–12:  sum top 2 stableford from the group
//   Holes 13–17: sum top 3 stableford from the group
//   Hole 18:     sum all 4 stableford from the group
// Group totals summed per team → higher team total wins → pointsPerWin.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import type { CompetitionInput, HoleData, ParticipantData } from './index';
import type { RumbleConfig } from '../competitions';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface RumbleHoleScore {
  holeNumber: number;
  /** Stableford points contributed by each player on this hole */
  playerPoints: { roundParticipantId: string; points: number }[];
  /** How many scores were counted (1 / 2 / 3 / 4 depending on hole range) */
  countUsed: number;
  /** The group's hole contribution (sum of top N) */
  groupContribution: number;
}

export interface RumbleGroupResult {
  roundGroupId: string;
  groupNumber: number;
  groupName: string | null;
  teamId: string;
  teamName: string;
  holeScores: RumbleHoleScore[];
  groupTotal: number;
}

export interface RumbleTeamResult {
  teamId: string;
  teamName: string;
  groupResults: RumbleGroupResult[];
  teamTotal: number;
  points: number;
  winner: boolean;
}

export interface RumbleResult {
  teamResults: RumbleTeamResult[];
  /** Text description of the outcome */
  resultText: string;
}

// ──────────────────────────────────────────────
// How many scores count per hole number
// ──────────────────────────────────────────────

function countForHole(holeNumber: number): number {
  if (holeNumber <= 6) return 1;
  if (holeNumber <= 12) return 2;
  if (holeNumber <= 17) return 3;
  return 4; // hole 18
}

// ──────────────────────────────────────────────
// Score a single group's contribution across all holes
// ──────────────────────────────────────────────

function scoreGroup(
  members: ParticipantData[],
  holes: HoleData[],
  scoreLookup: Map<string, number>,
): { holeScores: RumbleHoleScore[]; groupTotal: number } {
  const sortedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  let groupTotal = 0;

  const holeScores: RumbleHoleScore[] = sortedHoles.map((hole) => {
    const playerPoints = members.map((p) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const strokes = scoreLookup.get(key);
      if (strokes === undefined) {
        return { roundParticipantId: p.roundParticipantId, points: 0 };
      }
      const received = getStrokesOnHole(p.playingHandicap, hole.strokeIndex);
      return {
        roundParticipantId: p.roundParticipantId,
        points: stablefordPoints(strokes, hole.par, received),
      };
    });

    // Only count holes where at least one player has an actual score
    const hasAnyScore = members.some((p) =>
      scoreLookup.has(`${p.roundParticipantId}:${hole.holeNumber}`),
    );

    if (!hasAnyScore) {
      return {
        holeNumber: hole.holeNumber,
        playerPoints,
        countUsed: 0,
        groupContribution: 0,
      };
    }

    const count = countForHole(hole.holeNumber);
    // Sort descending, take top N
    const sorted = [...playerPoints].sort((a, b) => b.points - a.points);
    const topN = sorted.slice(0, count);
    const groupContribution = topN.reduce((s, p) => s + p.points, 0);
    groupTotal += groupContribution;

    return {
      holeNumber: hole.holeNumber,
      playerPoints,
      countUsed: count,
      groupContribution,
    };
  });

  return { holeScores, groupTotal };
}

// ──────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────

/**
 * Calculates rumble results for a competition.
 *
 * Rumble is a team format where each group contributes a score derived from
 * the top-N stableford scores per hole (1 on holes 1–6, 2 on 7–12,
 * 3 on 13–17, all 4 on hole 18). Group totals are summed per team.
 * The team with the highest total wins.
 */
export function calculateRumble(
  input: CompetitionInput,
  config: RumbleConfig['config'],
): RumbleResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const participantMap = new Map(
    input.participants.map((p) => [p.roundParticipantId, p]),
  );
  const teams = input.teams ?? [];
  const groups = input.groups ?? [];

  // Build team totals across all their groups
  const teamResultMap = new Map<
    string,
    { teamName: string; teamTotal: number; groupResults: RumbleGroupResult[] }
  >();

  for (const team of teams) {
    teamResultMap.set(team.teamId, {
      teamName: team.name,
      teamTotal: 0,
      groupResults: [],
    });
  }

  for (const group of groups) {
    const groupParticipantIds = new Set(group.memberParticipantIds);
    const members = group.memberParticipantIds
      .map((id) => participantMap.get(id))
      .filter(Boolean) as ParticipantData[];

    if (members.length === 0) continue;

    // Determine which team this group belongs to
    // All members should be on the same team — use first member's team
    const team = teams.find((t) =>
      t.memberParticipantIds.some((id) => groupParticipantIds.has(id)),
    );
    if (!team) continue;

    const { holeScores, groupTotal } = scoreGroup(
      members,
      input.holes,
      scoreLookup,
    );

    const groupResult: RumbleGroupResult = {
      roundGroupId: group.roundGroupId,
      groupNumber: group.groupNumber,
      groupName: group.name,
      teamId: team.teamId,
      teamName: team.name,
      holeScores,
      groupTotal,
    };

    const entry = teamResultMap.get(team.teamId);
    if (entry) {
      entry.groupResults.push(groupResult);
      entry.teamTotal += groupTotal;
    }
  }

  // Determine winner
  const teamTotals = [...teamResultMap.entries()].map(
    ([teamId, { teamName, teamTotal, groupResults }]) => ({
      teamId,
      teamName,
      teamTotal,
      groupResults,
    }),
  );

  const maxTotal = Math.max(...teamTotals.map((t) => t.teamTotal), 0);
  const winners = teamTotals.filter((t) => t.teamTotal === maxTotal);
  const isTie = winners.length > 1;

  const teamResults: RumbleTeamResult[] = teamTotals.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    groupResults: t.groupResults,
    teamTotal: t.teamTotal,
    points: isTie ? 0 : t.teamTotal === maxTotal ? config.pointsPerWin : 0,
    winner: t.teamTotal === maxTotal,
  }));

  let resultText: string;
  if (teamTotals.length === 0) {
    resultText = 'No teams';
  } else if (isTie) {
    resultText = `Tied — ${winners.map((w) => w.teamName).join(' & ')} (${maxTotal} pts each)`;
  } else {
    const winner = winners[0];
    const loser = teamTotals.find((t) => t.teamId !== winner.teamId);
    resultText = loser
      ? `${winner.teamName} wins ${winner.teamTotal}–${loser.teamTotal}`
      : `${winner.teamName} wins ${winner.teamTotal}`;
  }

  return { teamResults, resultText };
}
