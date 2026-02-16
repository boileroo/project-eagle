import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

type ActiveRound = {
  tournamentId: string;
  roundId: string;
};

const STORAGE_KEY = 'project-eagle-active-round';

export function OfflineFallback({
  roundId,
  tournamentId,
}: {
  roundId: string | null;
  tournamentId: string | null;
}) {
  const [storedRound, setStoredRound] = useState<ActiveRound | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ActiveRound | null;
      if (parsed?.roundId && parsed?.tournamentId) {
        setStoredRound(parsed);
      }
    } catch {
      setStoredRound(null);
    }
  }, []);

  const activeRound =
    roundId && tournamentId ? { roundId, tournamentId } : storedRound;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-4xl">📴</div>
        <h1 className="text-2xl font-semibold">You are offline</h1>
        <p className="text-muted-foreground">
          This page needs a solid connection. You can keep scoring on your
          active round while offline.
        </p>
        {activeRound ? (
          <Button asChild>
            <Link
              to="/tournaments/$tournamentId/rounds/$roundId"
              params={{
                tournamentId: activeRound.tournamentId,
                roundId: activeRound.roundId,
              }}
            >
              Return to active round
            </Link>
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">
            No active round found yet. Connect to continue.
          </p>
        )}
      </div>
    </div>
  );
}
