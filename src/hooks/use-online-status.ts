import { useEffect, useRef, useState } from 'react';

// How long to wait before declaring offline, to avoid flashing on load/refresh.
const OFFLINE_DEBOUNCE_MS = 500;

export function useOnlineStatus() {
  // Always start optimistically online — avoids SSR/hydration flash.
  const [online, setOnline] = useState(true);
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Sync with actual state after mount without debounce only if we're
    // already online, so the initial render stays stable.
    if (navigator.onLine) {
      setOnline(true);
    }

    const handleOnline = () => {
      if (offlineTimer.current) {
        clearTimeout(offlineTimer.current);
        offlineTimer.current = null;
      }
      setOnline(true);
    };

    const handleOffline = () => {
      offlineTimer.current = setTimeout(() => {
        setOnline(false);
      }, OFFLINE_DEBOUNCE_MS);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
    };
  }, []);

  return online;
}
