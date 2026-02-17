import { useEffect, useState } from 'react';
import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useRouter,
  useMatchRoute,
} from '@tanstack/react-router';
import { useIsMutating } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { signOutFn } from '@/lib/auth.server';
import { useOnlineStatus } from '@/hooks';
import { OfflineFallback } from '@/components/offline-fallback';

// Protected layout — all child routes require authentication
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' });
    } // Return the narrowed user so child routes get a non-null type
    return { user: context.user };
  },
  component: AppLayout,
});

const navLinks = [
  { to: '/' as const, label: 'Dashboard' },
  { to: '/courses' as const, label: 'Courses' },
  { to: '/rounds' as const, label: 'Rounds' },
  { to: '/tournaments' as const, label: 'Tournaments' },
] as const;

function AppLayout() {
  const { user } = Route.useRouteContext();
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
  const [showOfflineFallback, setShowOfflineFallback] = useState(false);

  useEffect(() => {
    if (isOnline || isRoundRoute) {
      setShowOfflineFallback(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowOfflineFallback(true);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOnline, isRoundRoute]);

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              🦅 Project Eagle
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-muted-foreground hover:text-foreground [&.active]:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  activeOptions={{ exact: link.to === '/' }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
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
            <Link
              to="/account"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {user.email}
            </Link>
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
          <OfflineFallback roundId={roundId} tournamentId={tournamentId} />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
