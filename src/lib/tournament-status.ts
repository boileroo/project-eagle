/**
 * Tournament status derivation logic.
 *
 * Tournament status is stored in the DB for query/filter purposes but is
 * **derived** from child round statuses. Whenever a round status changes the
 * tournament status should be recomputed and persisted.
 *
 * Statuses:
 *   setup     – All rounds are draft (or no rounds exist)           "Draft"
 *   scheduled – At least one round is scheduled; none are open/     "Awaiting Start"
 *               finalized
 *   underway  – At least one round is open, OR a mix of finalized   "Underway"
 *               and non-finalized rounds exists
 *   complete  – At least one round exists AND all are finalized      "Finished"
 */

export type TournamentStatus = 'setup' | 'scheduled' | 'underway' | 'complete';

export function deriveTournamentStatus(
  roundStatuses: string[],
): TournamentStatus {
  if (roundStatuses.length === 0) return 'setup';

  const allFinalized = roundStatuses.every((s) => s === 'finalized');
  if (allFinalized) return 'complete';

  const hasOpenOrFinalized = roundStatuses.some(
    (s) => s === 'open' || s === 'finalized',
  );
  if (hasOpenOrFinalized) return 'underway';

  const hasScheduled = roundStatuses.some((s) => s === 'scheduled');
  if (hasScheduled) return 'scheduled';

  // All are draft
  return 'setup';
}

/**
 * Whether the tournament is still in setup/draft mode (players, teams, rounds
 * can be freely added/removed).
 */
export function isTournamentInSetup(status: string): boolean {
  return status === 'setup';
}
