import { Link, useRouter, useMatchRoute, Outlet } from '@tanstack/react-router';
import { useIsMutating } from '@tanstack/react-query';
import { UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOutFn } from '@/lib/auth.server';
import { useOnlineStatus } from '@/hooks';
import { useOfflineFallback } from '@/hooks/use-offline-fallback';
import { OfflineFallback } from '@/components/offline-fallback';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface AppLayoutProps {
  user: AppUser;
}

export function AppLayout({ user }: AppLayoutProps) {
  const router = useRouter();
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
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <img src="/pwa-192x192.png" alt="Aerie" className="h-6 w-6" />
            Aerie
          </Link>
          <div className="flex items-center gap-4">
            {pendingScoreMutations > 0 && (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                Syncing…
              </span>
            )}
            {!isOnline && (
              <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-xs font-medium">
                Offline
              </span>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/account" className="flex items-center gap-1.5">
                <UserCircle className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {user.displayName ?? user.email}
                </span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOutFn();
                await router.invalidate();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
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
