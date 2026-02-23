// ──────────────────────────────────────────────
// Domain Engine — Shared Types & Dispatcher
//
// Pure TypeScript. No DB access. No framework coupling.
// ──────────────────────────────────────────────

import type { CompetitionConfig } from '../competitions';
import { calculateStableford, type StablefordResult } from './stableford';
import { calculateStrokePlay, type StrokePlayResult } from './stroke-play';
import { calculateMatchPlay, type MatchPlayResult } from './match-play';
import { calculateBestBall, type BestBallResult } from './best-ball';
import { calculateRumble, type RumbleResult } from './rumble';
import { calculateHiLo, type HiLoResult } from './hi-lo';
import { calculateWolf, type WolfResult } from './wolf';
import { calculateSixPoint, type SixPointResult } from './six-point';
import { calculateChair, type ChairResult } from './chair';

// ──────────────────────────────────────────────
// Engine Input Types (pre-resolved by caller)
// ──────────────────────────────────────────────

export interface HoleData {
  holeNumber: number;
  par: number;
  strokeIndex: number;
}

export interface ParticipantData {
  roundParticipantId: string;
  personId: string;
  displayName: string;
  /** Effective handicap — already resolved from override cascade */
  effectiveHandicap: number;
  /** Integer playing handicap (strokes received) */
  playingHandicap: number;
  /** Group this participant belongs to (nullable) */
  roundGroupId: string | null;
}

export interface GroupData {
  roundGroupId: string;
  groupNumber: number;
  name: string | null;
  memberParticipantIds: string[];
}

export interface TeamData {
  teamId: string;
  name: string;
  tournamentTeamId: string | null;
  memberParticipantIds: string[];
}

/** Resolved score: latest event per (participantId, holeNumber) */
export interface ResolvedScore {
  roundParticipantId: string;
  holeNumber: number;
  strokes: number;
}

/** Wolf per-hole game decision (latest per holeNumber wins) */
export interface GameDecisionData {
  holeNumber: number;
  data: {
    wolfPlayerId: string;
    partnerPlayerId: string | null;
  };
}

export interface CompetitionInput {
  competition: {
    id: string;
    name: string;
    config: CompetitionConfig;
    groupScope: 'all' | 'within_group';
  };
  holes: HoleData[];
  participants: ParticipantData[];
  scores: ResolvedScore[];
  teams?: TeamData[];
  groups?: GroupData[];
  /** Wolf only: per-hole game decisions (latest per holeNumber) */
  gameDecisions?: GameDecisionData[];
}

// ──────────────────────────────────────────────
// Engine Result Types
// ──────────────────────────────────────────────

export type CompetitionResult =
  | { type: 'stableford'; result: StablefordResult }
  | { type: 'stroke_play'; result: StrokePlayResult }
  | { type: 'match_play'; result: MatchPlayResult }
  | { type: 'best_ball'; result: BestBallResult }
  | { type: 'nearest_pin'; result: null }
  | { type: 'longest_drive'; result: null }
  | { type: 'rumble'; result: RumbleResult }
  | { type: 'hi_lo'; result: HiLoResult }
  | { type: 'wolf'; result: WolfResult }
  | { type: 'six_point'; result: SixPointResult }
  | { type: 'chair'; result: ChairResult };

// ──────────────────────────────────────────────
// Group-scoped result wrapper
// ──────────────────────────────────────────────

export interface GroupCompetitionResult {
  groupId: string;
  groupNumber: number;
  groupName: string | null;
  result: CompetitionResult;
}

// ──────────────────────────────────────────────
// Main Dispatcher
// ──────────────────────────────────────────────

/**
 * Calculate competition results.
 * For `within_group` competitions, call this once per group
 * with filtered participants/scores. Or use `calculateGroupedResults`
 * for convenience.
 */
export function calculateCompetitionResults(
  input: CompetitionInput,
): CompetitionResult {
  const { config } = input.competition;

  switch (config.formatType) {
    case 'stableford':
      return {
        type: 'stableford',
        result: calculateStableford(input),
      };
    case 'stroke_play':
      return {
        type: 'stroke_play',
        result: calculateStrokePlay(input, config.config),
      };
    case 'match_play':
      return {
        type: 'match_play',
        result: calculateMatchPlay(input, config.config),
      };
    case 'best_ball':
      return {
        type: 'best_ball',
        result: calculateBestBall(input, config.config),
      };
    case 'nearest_pin':
      // Bonus comps are award-based, not score-derived
      return { type: 'nearest_pin', result: null };
    case 'longest_drive':
      return { type: 'longest_drive', result: null };
    case 'rumble':
      return {
        type: 'rumble',
        result: calculateRumble(input, config.config),
      };
    case 'hi_lo':
      return {
        type: 'hi_lo',
        result: calculateHiLo(input, config.config),
      };
    case 'wolf':
      return {
        type: 'wolf',
        result: calculateWolf(input, input.gameDecisions ?? []),
      };
    case 'six_point':
      return {
        type: 'six_point',
        result: calculateSixPoint(input, config.config),
      };
    case 'chair':
      return {
        type: 'chair',
        result: calculateChair(input),
      };
    default:
      config satisfies never;
      throw new Error(`Unknown format type`);
  }
}

// Re-exports
export type { StablefordResult } from './stableford';
export type { StrokePlayResult } from './stroke-play';
export type { MatchPlayResult, MatchResult } from './match-play';
export type { BestBallResult, BestBallMatchResult } from './best-ball';
export type { RumbleResult, RumbleTeamResult } from './rumble';
export type { HiLoResult, HiLoMatchResult } from './hi-lo';
export type { WolfResult, WolfHoleResult, WolfPlayerResult } from './wolf';
export type { SixPointResult, SixPointPlayerResult } from './six-point';
export type { ChairResult, ChairPlayerResult } from './chair';

// ──────────────────────────────────────────────
// Group-aware calculation
//
// For `within_group` competitions, splits participants
// and scores by group and runs the engine per group.
// For `all` competitions, runs once over all data.
// ──────────────────────────────────────────────

export function calculateGroupedResults(
  input: CompetitionInput,
):
  | { scope: 'all'; result: CompetitionResult }
  | { scope: 'within_group'; results: GroupCompetitionResult[] } {
  const { competition, groups } = input;

  if (
    competition.groupScope !== 'within_group' ||
    !groups ||
    groups.length === 0
  ) {
    return { scope: 'all', result: calculateCompetitionResults(input) };
  }

  const groupResults: GroupCompetitionResult[] = [];

  for (const group of groups) {
    const groupParticipantIds = new Set(group.memberParticipantIds);

    const groupParticipants = input.participants.filter((p) =>
      groupParticipantIds.has(p.roundParticipantId),
    );
    const groupScores = input.scores.filter((s) =>
      groupParticipantIds.has(s.roundParticipantId),
    );
    const groupTeams = input.teams?.filter((t) =>
      t.memberParticipantIds.every((id) => groupParticipantIds.has(id)),
    );

    const groupInput: CompetitionInput = {
      ...input,
      participants: groupParticipants,
      scores: groupScores,
      teams: groupTeams,
      groups: [group],
    };

    groupResults.push({
      groupId: group.roundGroupId,
      groupNumber: group.groupNumber,
      groupName: group.name,
      result: calculateCompetitionResults(groupInput),
    });
  }

  return { scope: 'within_group', results: groupResults };
}
