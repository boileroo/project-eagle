import { Outlet, useMatchRoute } from '@tanstack/react-router';
import { useOnlineStatus } from '@/hooks';
import { useOfflineFallback } from '@/hooks/use-offline-fallback';
import { OfflineFallback } from '@/components/offline-fallback';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
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

  const showOfflineFallback = useOfflineFallback(isOnline, isRoundRoute);

  return (
    <div className="bg-background text-foreground mx-auto min-h-screen w-full max-w-125">
      <SiteHeader user={user} />
      <main className="px-4 py-4">
        {showOfflineFallback ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md space-y-4 text-center">
              <div className="text-4xl">📴</div>
              <Heading level={1}>You are offline</Heading>
              <Text color="muted">
                This page needs a solid connection. You can keep scoring on your
                active round while offline.
              </Text>
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
