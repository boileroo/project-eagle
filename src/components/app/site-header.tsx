import { Link, useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useSignOut } from '@/lib/auth';
import { toast } from 'sonner';
import { AerieTextLogo } from '@/components/ui/aerie-text-logo';
import { NavLink } from '@/components/ui/nav-link';
import { LiveBadge } from '@/components/ui/live-badge';
import { Text } from '@/components/ui/text';
import { UserMenu } from './user-menu';
import { MobileMenu } from './mobile-menu';
import { activeRoundsQueryOptions } from '@/lib/query-options';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface SiteHeaderProps {
  user: AppUser;
  isOnline: boolean;
  pendingScoreMutations: number;
}

const NAV_LINKS = [
  { name: 'Home', to: '/' as const },
  { name: 'Events', to: '/tournaments' as const },
] as const;

export function SiteHeader({
  user,
  isOnline,
  pendingScoreMutations,
}: SiteHeaderProps) {
  const router = useRouter();
  const [signOut] = useSignOut();

  const { data: activeRounds } = useQuery(activeRoundsQueryOptions());
  const activeRound = activeRounds?.[0];

  const handleSignOut = () => {
    signOut({
      onSuccess: async () => {
        await router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Left side: Logo & Desktop Nav */}
        <div className="flex h-full items-center gap-8 md:gap-12">
          <Link to="/" className="flex items-center">
            <AerieTextLogo />
          </Link>
          <nav className="hidden h-full items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to}>
                {link.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right side: Badges, User Menu, Mobile Menu */}
        <div className="flex items-center gap-3">
          {pendingScoreMutations > 0 && (
            <Text
              size="xs"
              color="muted"
              className="bg-muted rounded-full px-2 py-0.5 font-medium"
            >
              Syncing…
            </Text>
          )}
          {!isOnline && (
            <Text
              size="xs"
              className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium"
            >
              Offline
            </Text>
          )}

          {activeRound && (
            <Text size="xs" color="green" asChild>
              <Link
                to="/tournaments/$tournamentId/rounds/$roundId"
                params={{
                  tournamentId: activeRound.tournamentId,
                  roundId: activeRound.roundId,
                }}
                className="hover:text-tokyo-green/80 mr-3 hidden h-full items-center gap-2 px-1 font-semibold tracking-[0.15em] uppercase transition-colors md:flex"
              >
                Continue play at {activeRound.courseName}
                <LiveBadge className="ml-1" />
              </Link>
            </Text>
          )}

          <UserMenu user={user} onSignOut={handleSignOut} />
          <MobileMenu
            user={user}
            navLinks={[...NAV_LINKS]}
            onSignOut={handleSignOut}
            activeRound={activeRound}
          />
        </div>
      </div>
    </header>
  );
}
