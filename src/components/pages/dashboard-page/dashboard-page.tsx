import { useState } from 'react';
import type { ActiveRound } from '@/types';
import { ActiveRoundSection } from './components/active-round-section';
import { JoinTournamentDialog } from './components/join-tournament-dialog';
import { DashboardSection } from './components/dashboard-section';
import { DashboardCard } from './components/dashboard-card';

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

      <DashboardSection title="Start" gridCols={3}>
        <DashboardCard
          title="New Tournament"
          description="Multi-round event with teams, competitions, and standings"
          to="/tournaments/new"
          size="large"
        />
        <DashboardCard
          title="Quick Round"
          description="Jump straight into a round without tournament setup"
          to="/rounds/new"
          size="large"
        />
        <JoinTournamentDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
        />
      </DashboardSection>

      <DashboardSection title="Continue">
        <DashboardCard
          title="Events"
          description="View all tournaments and rounds"
          to="/tournaments"
        />
      </DashboardSection>

      <DashboardSection title="Manage">
        <DashboardCard
          title="Account"
          description="Manage your profile and settings"
          to="/account"
        />
        <DashboardCard
          title="Courses"
          description="Browse and manage the course library"
          to="/courses"
        />
        <DashboardCard
          title="Guests"
          description="Manage your saved guests"
          to="/guests"
        />
      </DashboardSection>
    </div>
  );
}
