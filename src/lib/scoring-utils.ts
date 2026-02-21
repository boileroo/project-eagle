// ──────────────────────────────────────────────
// Shared score display helpers
// Used by both the Scorecard table and the live scoring view
// ──────────────────────────────────────────────

/**
 * Background + border colour class for a score cell relative to par.
 * Eagle or better → info, Birdie → success, Par → none,
 * Bogey → warning, Double+ → destructive.
 */
export function scoreCellClass(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -2) return 'bg-info/10 border border-info';
  if (diff === -1) return 'bg-success/10 border border-success';
  if (diff === 0) return '';
  if (diff === 1) return 'bg-warning/10 border border-warning';
  return 'bg-destructive/10 border border-destructive';
}

/**
 * Get initials or short name from a display name.
 * e.g. "Tom Smith" → "TS", "Madonna" → "Mad"
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
 * e.g. -2 → "Eagle", -1 → "Birdie", 0 → "Par", 1 → "+1"
 */
export function parLabel(diff: number): string {
  if (diff <= -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return '+1';
  return `+${diff}`;
}

/**
 * Text colour class for a score diff shown inline (e.g. below the score number).
 */
export function scoreDiffColorClass(diff: number): string {
  if (diff < 0) return 'text-success';
  if (diff === 0) return 'text-muted-foreground';
  if (diff === 1) return 'text-warning';
  return 'text-destructive';
}
