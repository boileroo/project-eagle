import { useState } from 'react';
import type { ActiveRound } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { ActiveRoundSection } from './components/active-round-section';
import { JoinTournamentDialog } from './components/join-tournament-dialog';
import { CreateEventDialog } from './components/create-event-dialog';
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Home</h1>
        <p className="text-muted-foreground">
          Welcome back, {displayName ?? userEmail}
        </p>
      </div>

      <ActiveRoundSection activeRounds={activeRounds} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Button
          size="lg"
          className="h-14 text-lg font-semibold"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Event
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="bg-card hover:bg-muted h-14 border text-lg font-semibold shadow-sm"
          onClick={() => setJoinDialogOpen(true)}
        >
          <Users className="text-muted-foreground mr-2 h-5 w-5" />
          Join Event
        </Button>
      </div>

      <DashboardSection title="My Events" gridCols={1}>
        <DashboardCard
          title="All Events"
          description="View your past and upcoming tournaments and rounds"
          to="/tournaments"
        />
      </DashboardSection>

      <DashboardSection title="Settings & Library" gridCols={3}>
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

      <JoinTournamentDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
      />
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
