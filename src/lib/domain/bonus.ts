// ──────────────────────────────────────────────
// Bonus Competition Types (NTP / LD)
//
// Bonus comps are award-based, not score-derived.
// A commissioner or marker selects the winner via
// a dropdown during scoring for the relevant hole.
// The award is stored in the bonus_awards table.
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface BonusAward {
  id: string;
  competitionId: string;
  competitionName: string;
  formatType: 'nearest_pin' | 'longest_drive';
  holeNumber: number;
  roundParticipantId: string | null;
  displayName: string | null;
  awardedByUserId: string | null;
  awardedAt: string | null;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

export function formatBonusLabel(
  formatType: 'nearest_pin' | 'longest_drive',
  holeNumber: number,
): string {
  const typeLabel =
    formatType === 'nearest_pin' ? 'Nearest the Pin' : 'Longest Drive';
  return `${typeLabel} — Hole ${holeNumber}`;
}

/**
 * Given a list of competitions for a round, extract all bonus
 * competitions and the holes they apply to. Used by the scorecard
 * UI to show a dropdown on the relevant hole.
 */
export function getBonusHoles(
  competitions: {
    id: string;
    name: string;
    formatType: string;
    configJson: unknown;
  }[],
): {
  competitionId: string;
  competitionName: string;
  formatType: 'nearest_pin' | 'longest_drive';
  holeNumber: number;
}[] {
  return competitions
    .filter(
      (c) => c.formatType === 'nearest_pin' || c.formatType === 'longest_drive',
    )
    .map((c) => {
      const config = c.configJson as { holeNumber: number } | null;
      return {
        competitionId: c.id,
        competitionName: c.name,
        formatType: c.formatType as 'nearest_pin' | 'longest_drive',
        holeNumber: config?.holeNumber ?? 0,
      };
    })
    .filter((b) => b.holeNumber > 0);
}
