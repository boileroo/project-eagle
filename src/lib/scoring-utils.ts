/**
 * Get initials or short name from a display name.
 * e.g. "Tom Smith" -> "TS", "Madonna" -> "Mad"
 */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3);
  return parts
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/**
 * Human-readable label for a score diff relative to par.
 * e.g. -3 -> "Albatross", -2 -> "Eagle", -1 -> "Birdie", 0 -> "Par", 1 -> "+1"
 */
export function parLabel(diff: number): string {
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return '+1';
  return `+${diff}`;
}
