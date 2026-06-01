import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQuery, useIsMutating } from '@tanstack/react-query';
import { Menu, LogOut, Settings, Home, Trophy } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/ui/nav-link';
import { LiveBadge } from '@/components/ui/live-badge';
import { useSignOut } from '@/lib/auth';
import { useOnlineStatus } from '@/hooks';
import { activeRoundsQueryOptions } from '@/lib/query-options';
import { toast } from 'sonner';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface NavSheetProps {
  user: AppUser;
}

const NAV_LINKS = [
  { name: 'Home', to: '/' as const, icon: Home },
  { name: 'Events', to: '/tournaments' as const, icon: Trophy },
] as const;

const navRowClass =
  'flex h-16 w-full items-center gap-4 border-0 px-6 text-base font-medium normal-case tracking-normal text-foreground [&.active]:border-0 [&.active]:text-primary';

export function NavSheet({ user }: NavSheetProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [signOut] = useSignOut();
  const isOnline = useOnlineStatus();
  const pendingScoreMutations = useIsMutating({
    mutationKey: ['submit-score'],
  });

  const { data: activeRounds } = useQuery(activeRoundsQueryOptions());
  const activeRound = activeRounds?.[0];

  function handleSignOut() {
    setOpen(false);
    signOut({
      onSuccess: async () => {
        await router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 sm:max-w-[280px]"
      >
        <div className="px-6 pt-8 pb-6">
          <p className="text-base leading-snug font-semibold">
            {user.displayName ?? 'Account'}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">{user.email}</p>
          {pendingScoreMutations > 0 && (
            <p className="text-muted-foreground mt-2 text-xs">
              Syncing scores…
            </p>
          )}
          {!isOnline && (
            <p className="text-destructive mt-2 text-xs">Offline</p>
          )}
        </div>

        <div className="border-border border-t" />

        <div className="flex flex-1 flex-col">
          {activeRound && (
            <NavLink
              to="/tournaments/$tournamentId/rounds/$roundId"
              params={{
                tournamentId: activeRound.tournamentId,
                roundId: activeRound.roundId,
              }}
              onClick={() => setOpen(false)}
              className="bg-primary/10 text-primary flex h-16 w-full items-center gap-3 border-0 px-6 text-sm font-semibold tracking-normal normal-case [&.active]:border-0"
            >
              <LiveBadge />
              <span className="truncate">
                Continue at {activeRound.courseName}
              </span>
            </NavLink>
          )}

          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={navRowClass}
              >
                <Icon className="text-muted-foreground h-5 w-5 shrink-0" />
                {link.name}
              </NavLink>
            );
          })}
        </div>

        <div className="border-border mt-auto border-t" />

        <NavLink
          to="/account"
          onClick={() => setOpen(false)}
          className={navRowClass}
        >
          <Settings className="text-muted-foreground h-5 w-5 shrink-0" />
          Settings
        </NavLink>

        <div className="border-border border-t" />

        <button
          type="button"
          className="text-foreground flex h-16 w-full items-center gap-4 px-6 text-base font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="text-muted-foreground h-5 w-5 shrink-0" />
          Sign out
        </button>
      </SheetContent>
    </Sheet>
  );
}
