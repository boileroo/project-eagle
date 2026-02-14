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
  roundTeamId: string;
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
  | { type: 'longest_drive'; result: null };

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
        result: calculateStableford(input, config.config),
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

// ──────────────────────────────────────────────
// Group-aware calculation
//
// For `within_group` competitions, splits participants
// and scores by group and runs the engine per group.
// For `all` competitions, runs once over all data.
// ──────────────────────────────────────────────

export function calculateGroupedResults(
  input: CompetitionInput,
): { scope: 'all'; result: CompetitionResult } | { scope: 'within_group'; results: GroupCompetitionResult[] } {
  const { competition, groups } = input;

  if (competition.groupScope !== 'within_group' || !groups || groups.length === 0) {
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
      t.memberParticipantIds.some((id) => groupParticipantIds.has(id)),
    );

    const groupInput: CompetitionInput = {
      ...input,
      participants: groupParticipants,
      scores: groupScores,
      teams: groupTeams,
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
