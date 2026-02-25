// ──────────────────────────────────────────────
// Shared rank assignment helper
// ──────────────────────────────────────────────

/**
 * Assigns sequential ranks to a pre-sorted array of items in-place.
 *
 * Items with equal scores receive the same rank, and the next distinct score
 * receives the rank equal to its 1-based index position (i.e., standard
 * competition ranking: 1, 2, 2, 4 — not 1, 2, 2, 3).
 *
 * The array must already be sorted in the desired rank order (lowest index = rank 1)
 * before calling this function.
 *
 * @param items - Pre-sorted array of objects that have a writable `rank` field.
 * @param getScore - Extracts the numeric score used to detect ties.
 */
export function assignRanks<T extends { rank: number }>(
  items: T[],
  getScore: (item: T) => number,
): void {
  let rank = 1;
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && getScore(items[i]) !== getScore(items[i - 1])) {
      rank = i + 1;
    }
    items[i].rank = rank;
  }
}
