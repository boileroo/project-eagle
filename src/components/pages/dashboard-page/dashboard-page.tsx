import { useState } from 'react';
import type { ActiveRound } from '@/types';
import { DashboardHero } from './components/dashboard-hero';
import { ActiveRoundSection } from './components/active-round-section';
import { DashboardActionCard } from './components/dashboard-action-card';
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
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center space-y-12 py-12 md:py-20">
      <DashboardHero displayName={displayName} userEmail={userEmail} />

      <ActiveRoundSection activeRounds={activeRounds} />

      <div className="grid w-full gap-6 md:grid-cols-2">
        <DashboardActionCard
          eyebrow="New Event"
          eyebrowColor="red"
          title="Create Tournament"
          description="Set up a private clubhouse event, customize rules, and invite your circle."
          linkText="Start Setup"
          onClick={() => setCreateDialogOpen(true)}
        />
        <DashboardActionCard
          eyebrow="Active Circuit"
          eyebrowColor="blue"
          title="Join Tournament"
          description="Enter an invitational code or browse public elite-tier club rankings."
          linkText="Browse Events"
          onClick={() => setJoinDialogOpen(true)}
        />
      </div>

      <div className="w-full pt-12">
        <DashboardSection title="Settings & Library" gridCols={3}>
          <DashboardCard
            title="All Events"
            description="View your past and upcoming tournaments and rounds"
            to="/tournaments"
          />
          <DashboardCard
            title="Courses"
            description="Browse and manage the course library"
            to="/courses"
          />
          <DashboardCard
            title="Account"
            description="Manage your profile and settings"
            to="/account"
          />
        </DashboardSection>
      </div>

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
