// ──────────────────────────────────────────────
// Effective Handicap Resolver
// Pure functions — no DB calls
// ──────────────────────────────────────────────

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
  const parseOrZero = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  if (participant.handicapOverride != null) {
    return parseOrZero(participant.handicapOverride);
  }
  if (participant.tournamentParticipant?.handicapOverride != null) {
    return parseOrZero(participant.tournamentParticipant.handicapOverride);
  }
  return parseOrZero(participant.handicapSnapshot);
}

/**
 * Convert a decimal handicap to integer playing handicap (strokes received).
 * Standard: round to nearest integer, clamp 0–54.
 */
export function getPlayingHandicap(handicap: number): number {
  return Math.max(0, Math.min(54, Math.round(handicap)));
}

/**
 * Calculate strokes received on a specific hole given playing handicap and stroke index.
 *
 * Standard allocation:
 *   - If playingHC >= strokeIndex → 1 stroke
 *   - If playingHC >= strokeIndex + 18 → 2 strokes
 *   - Otherwise → 0 strokes
 */
export function getStrokesOnHole(
  playingHandicap: number,
  strokeIndex: number,
): number {
  if (playingHandicap >= strokeIndex + 18) return 2;
  if (playingHandicap >= strokeIndex) return 1;
  return 0;
}
