// ──────────────────────────────────────────────
// Team Colour Utility
//
// Derives a stable display colour per team from
// the team's position in the tournament teams list.
// Uses inline hex colours (not Tailwind) to avoid
// purger issues with dynamic class names.
// ──────────────────────────────────────────────

/**
 * Six-colour palette — enough for any realistic team count.
 * Colours are chosen for good contrast on both light and dark backgrounds.
 */
const TEAM_HEX_COLOURS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
] as const;

/**
 * Returns the hex colour for a team at the given index.
 * Wraps around if there are more teams than palette entries.
 */
export function getTeamColour(index: number): string {
  return TEAM_HEX_COLOURS[index % TEAM_HEX_COLOURS.length];
}

/**
 * Builds a Map from teamId → hex colour from an ordered team list.
 * The list order determines the colour assignment — pass teams sorted
 * by their canonical order (e.g. createdAt ascending).
 */
export function buildTeamColourMap(
  teams: { id: string }[],
): Map<string, string> {
  return new Map(teams.map((t, i) => [t.id, getTeamColour(i)]));
}
