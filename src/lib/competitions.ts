// ──────────────────────────────────────────────
// Competition Config Types
// Zod discriminated union for all format types
// ──────────────────────────────────────────────

import { z } from 'zod';

// ──────────────────────────────────────────────
// Scoring basis enum (shared across formats)
// ──────────────────────────────────────────────

export const scoringBasisSchema = z.enum(['stableford', 'net_strokes', 'gross_strokes']);
export type ScoringBasis = z.infer<typeof scoringBasisSchema>;

// ──────────────────────────────────────────────
// Individual Stableford
// ──────────────────────────────────────────────

export const stablefordConfigSchema = z.object({
  formatType: z.literal('stableford'),
  config: z.object({
    /** Count-back tiebreaker: use last 9, last 6, last 3 holes */
    countBack: z.boolean().default(true),
  }),
});

// ──────────────────────────────────────────────
// Individual Stroke Play (gross or net)
// ──────────────────────────────────────────────

export const strokePlayConfigSchema = z.object({
  formatType: z.literal('stroke_play'),
  config: z.object({
    scoringBasis: z.enum(['net_strokes', 'gross_strokes']),
  }),
});

// ──────────────────────────────────────────────
// Match Play (1v1 using stableford points)
// Matches use stableford — a halved hole (0-0) stays halved
// ──────────────────────────────────────────────

export const matchPlayConfigSchema = z.object({
  formatType: z.literal('match_play'),
  config: z.object({
    /** Points awarded for winning this match (variable per round for jeopardy) */
    pointsPerWin: z.number().min(0).default(1),
    /** Points awarded for a halved match */
    pointsPerHalf: z.number().min(0).default(0.5),
    /** Pairings: array of [participantIdA, participantIdB] */
    pairings: z.array(
      z.object({
        playerA: z.string().uuid(),
        playerB: z.string().uuid(),
      }),
    ),
  }),
});

// ──────────────────────────────────────────────
// Best Ball (2v2, per-hole head-to-head, stableford)
// Best stableford score from each pair, compared per hole
// ──────────────────────────────────────────────

export const bestBallConfigSchema = z.object({
  formatType: z.literal('best_ball'),
  config: z.object({
    /** Points awarded for winning this match (variable for jeopardy) */
    pointsPerWin: z.number().min(0).default(1),
    /** Points awarded for a halved match */
    pointsPerHalf: z.number().min(0).default(0.5),
    /**
     * Team pairings derived from round teams.
     * Array of [roundTeamIdA, roundTeamIdB] matchups.
     */
    pairings: z.array(
      z.object({
        teamA: z.string().uuid(),
        teamB: z.string().uuid(),
      }),
    ),
  }),
});

// ──────────────────────────────────────────────
// Nearest the Pin
// ──────────────────────────────────────────────

export const nearestPinConfigSchema = z.object({
  formatType: z.literal('nearest_pin'),
  config: z.object({
    /** Which hole the NTP is on */
    holeNumber: z.number().int().min(1).max(18),
    /** standalone = separate award only; contributor = adds bonusPoints to individual standings */
    bonusMode: z.enum(['standalone', 'contributor']).default('standalone'),
    /** Points added to individual aggregate when mode is contributor */
    bonusPoints: z.number().min(0).default(1),
  }),
});

// ──────────────────────────────────────────────
// Longest Drive
// ──────────────────────────────────────────────

export const longestDriveConfigSchema = z.object({
  formatType: z.literal('longest_drive'),
  config: z.object({
    /** Which hole the LD is on */
    holeNumber: z.number().int().min(1).max(18),
    /** standalone = separate award only; contributor = adds bonusPoints to individual standings */
    bonusMode: z.enum(['standalone', 'contributor']).default('standalone'),
    /** Points added to individual aggregate when mode is contributor */
    bonusPoints: z.number().min(0).default(1),
  }),
});

// ──────────────────────────────────────────────
// Discriminated union of all configs
// ──────────────────────────────────────────────

export const competitionConfigSchema = z.discriminatedUnion('formatType', [
  stablefordConfigSchema,
  strokePlayConfigSchema,
  matchPlayConfigSchema,
  bestBallConfigSchema,
  nearestPinConfigSchema,
  longestDriveConfigSchema,
]);
export type CompetitionConfig = z.infer<typeof competitionConfigSchema>;

// Extract individual config types for convenience
export type StablefordConfig = z.infer<typeof stablefordConfigSchema>;
export type StrokePlayConfig = z.infer<typeof strokePlayConfigSchema>;
export type MatchPlayConfig = z.infer<typeof matchPlayConfigSchema>;
export type BestBallConfig = z.infer<typeof bestBallConfigSchema>;
export type NearestPinConfig = z.infer<typeof nearestPinConfigSchema>;
export type LongestDriveConfig = z.infer<typeof longestDriveConfigSchema>;

// ──────────────────────────────────────────────
// Format type labels (for UI display)
// ──────────────────────────────────────────────

export const FORMAT_TYPE_LABELS: Record<CompetitionConfig['formatType'], string> = {
  stableford: 'Stableford',
  stroke_play: 'Stroke Play',
  match_play: 'Match Play',
  best_ball: 'Best Ball',
  nearest_pin: 'Nearest the Pin',
  longest_drive: 'Longest Drive',
};

export const FORMAT_TYPES = Object.keys(FORMAT_TYPE_LABELS) as CompetitionConfig['formatType'][];

// ──────────────────────────────────────────────
// Helper: is this a team format?
// ──────────────────────────────────────────────

export function isTeamFormat(formatType: CompetitionConfig['formatType']): boolean {
  return formatType === 'best_ball';
}

// ──────────────────────────────────────────────
// Helper: is this a match-based format (has pairings & points)?
// ──────────────────────────────────────────────

export function isMatchFormat(formatType: CompetitionConfig['formatType']): boolean {
  return formatType === 'match_play' || formatType === 'best_ball';
}

// ──────────────────────────────────────────────
// Helper: is this a bonus competition?
// ──────────────────────────────────────────────

export function isBonusFormat(formatType: CompetitionConfig['formatType']): boolean {
  return formatType === 'nearest_pin' || formatType === 'longest_drive';
}

// ──────────────────────────────────────────────
// Participant type labels
// ──────────────────────────────────────────────

export const PARTICIPANT_TYPE_LABELS: Record<'individual' | 'team', string> = {
  individual: 'Individual',
  team: 'Team',
};

// ──────────────────────────────────────────────
// Group scope labels
// ──────────────────────────────────────────────

export type GroupScope = 'all' | 'within_group';

export const GROUP_SCOPE_LABELS: Record<GroupScope, string> = {
  all: 'All Players',
  within_group: 'Within Group',
};

export const GROUP_SCOPES = Object.keys(GROUP_SCOPE_LABELS) as GroupScope[];

// ──────────────────────────────────────────────
// Tournament Standings — Aggregation Config Types
//
// Defines how round-level competition results roll up
// into tournament-wide leaderboards. Extensible via
// discriminated union so new methods need only TS changes.
// ──────────────────────────────────────────────

export const sumStablefordAggregationSchema = z.object({
  method: z.literal('sum_stableford'),
});

export const lowestStrokesAggregationSchema = z.object({
  method: z.literal('lowest_strokes'),
  config: z.object({
    scoringBasis: z.enum(['net_strokes', 'gross_strokes']),
  }),
});

export const matchWinsAggregationSchema = z.object({
  method: z.literal('match_wins'),
  config: z.object({
    /** Points per match win (default 1) */
    pointsPerWin: z.number().min(0).default(1),
    /** Points per match half/draw (default 0.5) */
    pointsPerHalf: z.number().min(0).default(0.5),
  }),
});

export const aggregationConfigSchema = z.discriminatedUnion('method', [
  sumStablefordAggregationSchema,
  lowestStrokesAggregationSchema,
  matchWinsAggregationSchema,
]);
export type AggregationConfig = z.infer<typeof aggregationConfigSchema>;

export const AGGREGATION_METHOD_LABELS: Record<AggregationConfig['method'], string> = {
  sum_stableford: 'Total Stableford Points',
  lowest_strokes: 'Lowest Total Strokes',
  match_wins: 'Match Wins',
};

export const AGGREGATION_METHODS = Object.keys(
  AGGREGATION_METHOD_LABELS,
) as AggregationConfig['method'][];
