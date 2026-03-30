import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { UserCircle, Menu, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignOut } from '@/lib/auth';
import { toast } from 'sonner';

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

export function SiteHeader({
  user,
  isOnline,
  pendingScoreMutations,
}: SiteHeaderProps) {
  const router = useRouter();
  const [signOut] = useSignOut();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLinks = [
    { name: 'Home', to: '/' },
    { name: 'Events', to: '/tournaments' },
  ];

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Left side: Logo & Desktop Nav */}
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <img src="/pwa-192x192.png" alt="Aerie" className="h-6 w-6" />
            Aerie
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-muted-foreground hover:text-foreground [&.active]:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side: Badges, User Menu, Mobile Menu */}
        <div className="flex items-center gap-3">
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

          {/* Desktop User Menu */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 rounded-full px-3"
                >
                  <UserCircle className="text-muted-foreground h-5 w-5" />
                  <span className="text-sm font-medium">
                    {user.displayName ?? user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {user.displayName ?? 'Account'}
                    </p>
                    <p className="text-muted-foreground text-xs leading-none">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to="/account"
                    className="flex w-full cursor-pointer items-center"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col p-0">
                <SheetHeader className="border-b px-6 py-4 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <img
                      src="/pwa-192x192.png"
                      alt="Aerie"
                      className="h-5 w-5"
                    />
                    Aerie
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
                  <nav className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="hover:bg-muted [&.active]:bg-primary/10 [&.active]:text-primary flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
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
                      <p className="text-muted-foreground text-xs">
                        {user.email}
                      </p>
                    </div>
                    <nav className="flex flex-col gap-2">
                      <Link
                        to="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
                      >
                        <Settings className="h-5 w-5" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleSignOut();
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
        </div>
      </div>
    </header>
  );
}
