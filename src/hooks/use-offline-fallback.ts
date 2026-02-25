import { useEffect, useState } from 'react';

/**
 * Shows an offline fallback screen after a short delay when the user is
 * offline and not on a round route (where offline scoring is supported).
 *
 * The 250 ms delay prevents a flash for users who briefly lose connectivity
 * during page load / navigation.
 *
 * @param isOnline - Current online status from `useOnlineStatus`
 * @param isRoundRoute - Whether the current route is the live-scoring round page
 * @returns `true` when the offline fallback should be displayed
 */
export function useOfflineFallback(
  isOnline: boolean,
  isRoundRoute: boolean,
): boolean {
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);

  useEffect(() => {
    if (isOnline || isRoundRoute) {
      setShowOfflineFallback(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowOfflineFallback(true);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isOnline, isRoundRoute]);

  return showOfflineFallback;
}
