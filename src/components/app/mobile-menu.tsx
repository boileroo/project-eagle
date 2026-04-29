import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AerieTextLogo } from '@/components/ui/aerie-text-logo';
import type { ActiveRound } from '@/types';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface NavLinkConfig {
  name: string;
  to: '/' | '/tournaments';
}

interface MobileMenuProps {
  user: AppUser;
  navLinks: NavLinkConfig[];
  onSignOut: () => void;
  activeRound?: ActiveRound;
}

export function MobileMenu({
  user,
  navLinks,
  onSignOut,
  activeRound,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-tokyo-blue h-9 w-9"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col p-0">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle className="flex items-center">
              <AerieTextLogo />
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
            <nav className="flex flex-col gap-2">
              {activeRound && (
                <Link
                  to="/tournaments/$tournamentId/rounds/$roundId"
                  params={{
                    tournamentId: activeRound.tournamentId,
                    roundId: activeRound.roundId,
                  }}
                  onClick={() => setOpen(false)}
                  className="bg-tokyo-green/10 text-tokyo-green hover:bg-tokyo-green/20 mb-4 flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold tracking-wide transition-colors"
                >
                  Continue play at {activeRound.courseName}
                  <span className="bg-tokyo-green text-background rounded-full px-2 py-0.5 text-xs">
                    Live
                  </span>
                </Link>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="text-tokyo-red hover:bg-tokyo-red/10 [&.active]:bg-tokyo-blue/10 [&.active]:text-tokyo-blue flex items-center rounded-md px-3 py-2.5 text-sm font-semibold tracking-wide transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-4">
              <div className="bg-muted/50 mb-4 rounded-lg px-4 py-3">
                <p className="text-sm font-medium">
                  {user.displayName ?? 'Account'}
                </p>
                <p className="text-muted-foreground text-xs">{user.email}</p>
              </div>
              <nav className="flex flex-col gap-2">
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    onSignOut();
                  }}
                  className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Log out
                </button>
              </nav>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
