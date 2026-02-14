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
  };
  holes: HoleData[];
  participants: ParticipantData[];
  scores: ResolvedScore[];
  teams?: TeamData[];
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
// Main Dispatcher
// ──────────────────────────────────────────────

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
