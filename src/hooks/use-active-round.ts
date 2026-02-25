import { useEffect } from 'react';

const ACTIVE_ROUND_KEY = 'project-eagle-active-round';

/**
 * Persists the current active round (tournamentId + roundId) to localStorage
 * whenever either value changes. The offline fallback screen reads this value
 * to offer a navigation link back to the scoring page.
 */
export function useActiveRound(tournamentId: string, roundId: string): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      ACTIVE_ROUND_KEY,
      JSON.stringify({ tournamentId, roundId }),
    );
  }, [tournamentId, roundId]);
}
