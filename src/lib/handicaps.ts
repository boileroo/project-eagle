const MIN_HANDICAP = -10;
const MAX_HANDICAP = 54;

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function formatHandicapMagnitude(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function parseHandicap(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : normalizeZero(value);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isPlusDisplay = trimmed.startsWith('+');
  const rawValue = isPlusDisplay ? trimmed.slice(1) : trimmed;
  const parsed = Number.parseFloat(rawValue);

  if (Number.isNaN(parsed)) return null;
  return normalizeZero(isPlusDisplay ? -parsed : parsed);
}

export function isValidHandicap(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (value < MIN_HANDICAP || value > MAX_HANDICAP) return false;

  return Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
}

export function formatHandicap(
  value: string | number | null | undefined,
): string | null {
  const parsed = parseHandicap(value);
  if (parsed == null) return null;

  if (parsed < 0) {
    return `+${formatHandicapMagnitude(Math.abs(parsed))}`;
  }

  return formatHandicapMagnitude(parsed);
}

export function formatHandicapWithFallback(
  value: string | number | null | undefined,
  fallback = '-',
): string {
  return formatHandicap(value) ?? fallback;
}

export function formatHandicapAdjustment(value: number): string {
  if (value === 0) return 'Level';

  const magnitude = Math.abs(value);
  const strokeLabel = magnitude === 1 ? 'stroke' : 'strokes';
  return value > 0
    ? `Receives ${magnitude} ${strokeLabel}`
    : `Gives ${magnitude} ${strokeLabel}`;
}

export function applyHandicapSign(
  magnitude: number | null,
  isPlusHandicap: boolean,
): number | null {
  if (magnitude == null || Number.isNaN(magnitude)) return null;

  const normalizedMagnitude = Math.abs(magnitude);
  if (normalizedMagnitude === 0) return 0;

  return isPlusHandicap ? -normalizedMagnitude : normalizedMagnitude;
}

/**
 * Resolves the effective handicap for a round participant.
 * Walk the override cascade:
 *   roundParticipant.handicapOverride
 *     → tournamentParticipant.handicapOverride
 *     → roundParticipant.handicapSnapshot
 */
export function resolveEffectiveHandicap(participant: {
  handicapOverride: string | null;
  handicapSnapshot: string;
  tournamentParticipant?: {
    handicapOverride: string | null;
  } | null;
}): number {
  if (participant.handicapOverride != null) {
    return parseHandicap(participant.handicapOverride) ?? 0;
  }
  if (participant.tournamentParticipant?.handicapOverride != null) {
    return (
      parseHandicap(participant.tournamentParticipant.handicapOverride) ?? 0
    );
  }
  return parseHandicap(participant.handicapSnapshot) ?? 0;
}

/**
 * Convert a decimal handicap to integer playing handicap.
 * Standard: round to nearest integer, clamp to the supported range.
 */
export function getPlayingHandicap(handicap: number): number {
  const rounded = Math.round(handicap);
  return normalizeZero(Math.max(MIN_HANDICAP, Math.min(MAX_HANDICAP, rounded)));
}

/**
 * Calculate the signed handicap adjustment on a specific hole.
 * Positive values mean strokes received; negative values mean strokes given.
 */
export function getStrokesOnHole(
  playingHandicap: number,
  strokeIndex: number,
): number {
  const normalizedPlayingHandicap = getPlayingHandicap(playingHandicap);
  const sign = Math.sign(normalizedPlayingHandicap);
  const absoluteHandicap = Math.abs(normalizedPlayingHandicap);

  if (sign === 0 || absoluteHandicap < strokeIndex) {
    return 0;
  }

  const adjustments = Math.floor((absoluteHandicap - strokeIndex) / 18) + 1;
  return adjustments * sign;
}
