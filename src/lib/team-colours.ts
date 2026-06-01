/**
 * Returns a neutral placeholder colour for a team at the given index.
 * TODO: Replace with new design system colour assignment.
 */
export function getTeamColour(_index: number): string {
  return '#888888';
}

/**
 * Builds a Map from teamId to hex colour from an ordered team list.
 * Currently returns an empty map — no colour differentiation until
 * a new design system is in place.
 */
export function buildTeamColourMap(
  _teams: { id: string }[],
): Map<string, string> {
  return new Map();
}
