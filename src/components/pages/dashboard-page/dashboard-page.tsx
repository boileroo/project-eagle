import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { ActiveRound } from '@/types';
import { ActiveRoundSection } from './components/active-round-section';
import { JoinTournamentDialog } from './components/join-tournament-dialog';

export function DashboardPage({
  userEmail,
  displayName,
  activeRounds,
}: {
  userEmail: string;
  displayName: string | null;
  activeRounds: ActiveRound[];
}) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {displayName ?? userEmail}
        </p>
      </div>

      <ActiveRoundSection activeRounds={activeRounds} />

      {/* ── Zone 2: Start ── */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Start
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/tournaments/new"
            className="group bg-card hover:bg-background rounded-lg border p-6 transition-colors"
          >
            <h3 className="mb-1 font-semibold">New Tournament</h3>
            <p className="text-muted-foreground text-sm">
              Multi-round event with teams, competitions, and standings
            </p>
          </Link>
          <Link
            to="/rounds/new"
            className="group bg-card hover:bg-background rounded-lg border p-6 transition-colors"
          >
            <h3 className="mb-1 font-semibold">Quick Round</h3>
            <p className="text-muted-foreground text-sm">
              Jump straight into a round without tournament setup
            </p>
          </Link>
          <JoinTournamentDialog
            open={joinDialogOpen}
            onOpenChange={setJoinDialogOpen}
          />
        </div>
      </section>

      {/* ── Zone 3: Manage ── */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Manage
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/tournaments"
            className="group bg-card hover:bg-background rounded-lg border p-5 transition-colors"
          >
            <h3 className="mb-1 text-sm font-medium">Events</h3>
            <p className="text-muted-foreground text-xs">
              View all tournaments and rounds
            </p>
          </Link>
          <Link
            to="/courses"
            className="group bg-card hover:bg-background rounded-lg border p-5 transition-colors"
          >
            <h3 className="mb-1 text-sm font-medium">Courses</h3>
            <p className="text-muted-foreground text-xs">
              Browse and manage the course library
            </p>
          </Link>
          <Link
            to="/guests"
            className="group bg-card hover:bg-background rounded-lg border p-5 transition-colors"
          >
            <h3 className="mb-1 text-sm font-medium">Guests</h3>
            <p className="text-muted-foreground text-xs">
              Manage your saved guests
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
