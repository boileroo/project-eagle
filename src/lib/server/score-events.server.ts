/**
 * Given a list of scores ordered by createdAt DESC,
 * returns only the latest score per (roundPlayerId, holeNumber).
 */
export function resolveLatestScores<
  T extends { roundPlayerId: string; holeNumber: number },
>(events: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const event of events) {
    const key = `${event.roundPlayerId}:${event.holeNumber}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(event);
  }

  return result;
}
