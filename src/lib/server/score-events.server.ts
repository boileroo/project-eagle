/**
 * Given a list of score events ordered by createdAt DESC,
 * returns only the latest event per (roundParticipantId, holeNumber).
 */
export function resolveLatestScores<
  T extends { roundParticipantId: string; holeNumber: number },
>(events: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const event of events) {
    const key = `${event.roundParticipantId}:${event.holeNumber}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(event);
  }

  return result;
}
