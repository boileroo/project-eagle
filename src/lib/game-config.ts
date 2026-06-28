import { z } from 'zod';

export const scoringBasisSchema = z.enum([
  'stableford',
  'net_strokes',
  'gross_strokes',
]);
export type ScoringBasis = z.infer<typeof scoringBasisSchema>;

export const matchPlayConfigSchema = z.object({
  formatType: z.literal('match_play'),
  config: z.object({
    scoringBasis: z.enum(['stableford', 'gross', 'net']).default('stableford'),
    pointsPerWin: z.number().min(0).default(1),
    pointsPerHalf: z.number().min(0).default(0.5),
    pairings: z.array(
      z.object({
        playerA: z.string().uuid(),
        playerB: z.string().uuid(),
      }),
    ),
  }),
});

export const bestBallConfigSchema = z.object({
  formatType: z.literal('best_ball'),
  config: z.object({
    pointsPerWin: z.number().min(0).default(1),
    pointsPerHalf: z.number().min(0).default(0.5),
    pairings: z.array(
      z.object({
        teamA: z.string().uuid(),
        teamB: z.string().uuid(),
      }),
    ),
  }),
});

export const nearestPinConfigSchema = z.object({
  formatType: z.literal('nearest_pin'),
  config: z.object({
    holeNumber: z.number().int().min(1).max(18),
    bonusMode: z.enum(['standalone', 'contributor']).default('standalone'),
    bonusPoints: z.number().min(0).default(1),
  }),
});

export const longestDriveConfigSchema = z.object({
  formatType: z.literal('longest_drive'),
  config: z.object({
    holeNumber: z.number().int().min(1).max(18),
    bonusMode: z.enum(['standalone', 'contributor']).default('standalone'),
    bonusPoints: z.number().min(0).default(1),
  }),
});

export const rumbleConfigSchema = z.object({
  formatType: z.literal('rumble'),
  config: z.object({
    pointsPerWin: z.number().min(0).default(1),
    scoringBasis: z.enum(['stableford', 'net', 'gross']).default('stableford'),
  }),
});

export const hiLoConfigSchema = z.object({
  formatType: z.literal('hi_lo'),
  config: z.object({
    pointsPerWin: z.number().min(0).default(1),
    pointsPerHalf: z.number().min(0).default(0.5),
  }),
});

export const wolfConfigSchema = z.object({
  formatType: z.literal('wolf'),
  config: z.object({
    scoringBasis: z.enum(['stableford', 'gross', 'net']).default('stableford'),
  }),
});

export const sixPointConfigSchema = z.object({
  formatType: z.literal('six_point'),
  config: z.object({
    scoringBasis: z.enum(['stableford', 'gross', 'net']).default('stableford'),
  }),
});

export const chairConfigSchema = z.object({
  formatType: z.literal('chair'),
  config: z.object({
    scoringBasis: z.enum(['stableford', 'gross', 'net']).default('stableford'),
  }),
});

export const gameConfigSchema = z.discriminatedUnion('formatType', [
  matchPlayConfigSchema,
  bestBallConfigSchema,
  nearestPinConfigSchema,
  longestDriveConfigSchema,
  rumbleConfigSchema,
  hiLoConfigSchema,
  wolfConfigSchema,
  sixPointConfigSchema,
  chairConfigSchema,
]);
export type GameConfig = z.infer<typeof gameConfigSchema>;

export type MatchPlayConfig = z.infer<typeof matchPlayConfigSchema>;
export type BestBallConfig = z.infer<typeof bestBallConfigSchema>;
export type NearestPinConfig = z.infer<typeof nearestPinConfigSchema>;
export type LongestDriveConfig = z.infer<typeof longestDriveConfigSchema>;
export type RumbleConfig = z.infer<typeof rumbleConfigSchema>;
export type HiLoConfig = z.infer<typeof hiLoConfigSchema>;
export type WolfConfig = z.infer<typeof wolfConfigSchema>;
export type SixPointConfig = z.infer<typeof sixPointConfigSchema>;
export type ChairConfig = z.infer<typeof chairConfigSchema>;

export const GAME_FORMAT_LABELS: Record<GameConfig['formatType'], string> = {
  match_play: 'Singles',
  best_ball: 'Best Ball',
  nearest_pin: 'Nearest the Pin',
  longest_drive: 'Longest Drive',
  rumble: 'Rumble',
  hi_lo: 'Hi-Lo',
  wolf: 'Wolf',
  six_point: 'Six Point',
  chair: 'Chair',
};

export const GAME_FORMATS = Object.keys(
  GAME_FORMAT_LABELS,
) as GameConfig['formatType'][];

/**
 * Returns true for formats that inherently require team composition
 * (2v2 pairs or same-team groups). Does not include match_play, which
 * can be either individual or team-based depending on context.
 */
export function isTeamFormat(formatType: GameConfig['formatType']): boolean {
  return (
    formatType === 'best_ball' ||
    formatType === 'hi_lo' ||
    formatType === 'rumble'
  );
}

/**
 * Returns true for side-game formats (NTP / LD) that belong in the
 * side_games table rather than the games table.
 */
export function isBonusFormat(formatType: GameConfig['formatType']): boolean {
  return formatType === 'nearest_pin' || formatType === 'longest_drive';
}

/**
 * Returns true for any group-game format (everything except side-game formats).
 */
export function isGameFormat(formatType: GameConfig['formatType']): boolean {
  return !isBonusFormat(formatType);
}
