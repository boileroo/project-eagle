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

  return activeRound ? (
    <div className="flex flex-col items-center gap-2">
      <Button asChild>
        <Link
          to="/tournaments/$tournamentId/rounds/$roundId/play"
          params={{
            tournamentId: activeRound.tournamentId,
            roundId: activeRound.roundId,
          }}
          search={{ hole: 1, group: undefined }}
        >
          Continue live scoring
        </Link>
      </Button>
    </div>
  ) : (
    <p className="text-muted-foreground text-sm">
      No active round found yet. Connect to continue.
    </p>
  );
}
