import { Link } from '@tanstack/react-router';
import { NavSheet } from './nav-sheet';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface SiteHeaderProps {
  user: AppUser;
}

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <header className="bg-background border-border sticky top-0 z-50 border-b">
      <div className="flex h-12 items-center justify-between px-4">
        <Link to="/">
          <span className="font-sans text-sm font-bold tracking-tight">
            <span className="text-foreground">Aerie</span>
            <span className="text-primary">.</span>
          </span>
        </Link>
        <NavSheet user={user} />
      </div>
    </header>
  );
}
