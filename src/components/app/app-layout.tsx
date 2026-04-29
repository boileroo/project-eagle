import { Outlet, useMatchRoute } from '@tanstack/react-router';
import { useIsMutating } from '@tanstack/react-query';
import { useOnlineStatus } from '@/hooks';
import { useOfflineFallback } from '@/hooks/use-offline-fallback';
import { OfflineFallback } from '@/components/offline-fallback';
import { SiteHeader } from './site-header';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface AppLayoutProps {
  user: AppUser;
}

export function AppLayout({ user }: AppLayoutProps) {
  const isOnline = useOnlineStatus();
  const matchRoute = useMatchRoute();

  const roundMatch = matchRoute({
    to: '/tournaments/$tournamentId/rounds/$roundId',
    fuzzy: true,
  });
  const roundId = roundMatch ? roundMatch.roundId : null;
  const tournamentId = roundMatch ? roundMatch.tournamentId : null;
  const isRoundRoute = roundMatch !== false;

  const pendingScoreMutations = useIsMutating({
    mutationKey: ['submit-score'],
  });

  const showOfflineFallback = useOfflineFallback(isOnline, isRoundRoute);

  return (
    <div className="min-h-screen">
      <SiteHeader
        user={user}
        isOnline={isOnline}
        pendingScoreMutations={pendingScoreMutations}
      />
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        {showOfflineFallback ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md space-y-4 text-center">
              <div className="text-4xl">📴</div>
              <h1 className="text-2xl font-semibold">You are offline</h1>
              <p className="text-muted-foreground">
                This page needs a solid connection. You can keep scoring on your
                active round while offline.
              </p>
              <OfflineFallback roundId={roundId} tournamentId={tournamentId} />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
