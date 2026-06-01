import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Play,
  Trophy,
  Map,
  Users,
  Settings,
  PlusCircle,
  ChevronRight,
} from 'lucide-react';
import type { ActiveRound } from '@/types';
import { DashboardCard } from '@/components/ui/dashboard-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { JoinTournamentForm } from './components/join-tournament-form';
import { CreateEventContent } from './components/create-event-content';
import type { ElementType } from 'react';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      size="xs"
      color="muted"
      className="mb-4 pl-1 font-bold tracking-[0.2em] uppercase"
    >
      {children}
    </Text>
  );
}

interface NavRowProps {
  icon: ElementType;
  label: string;
  onClick: () => void;
}

function NavRow({ icon: Icon, label, onClick }: NavRowProps) {
  return (
    <button
      onClick={onClick}
      className="hover:bg-muted/40 focus-visible:ring-primary active:bg-muted/60 flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <div className="bg-muted/60 flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-4" />
      </div>
      <Text size="sm" weight="semibold" className="flex-1">
        {label}
      </Text>
      <ChevronRight className="text-muted-foreground/50 size-4" />
    </button>
  );
}

export function DashboardPage({
  displayName,
  activeRounds,
}: {
  displayName: string | null;
  activeRounds: ActiveRound[];
}) {
  const navigate = useNavigate();

  const [joinExpanded, setJoinExpanded] = useState(false);
  const [createExpanded, setCreateExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-10 pb-16">
      <div className="mb-2 text-center">
        <Heading level={1}>Welcome back</Heading>
        {displayName && (
          <Text size="base" color="muted">
            {displayName.split(' ')[0]}
          </Text>
        )}
      </div>

      {activeRounds.length > 0 && (
        <section>
          <SectionLabel>Active Rounds</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeRounds.map((round) => (
              <DashboardCard
                key={round.roundId}
                color="primary"
                icon={Play}
                className="min-h-[160px] md:col-span-2"
                title={
                  round.isSingleRound
                    ? round.tournamentName
                    : `Round ${round.roundNumber ?? 1}`
                }
                description={
                  round.isSingleRound
                    ? round.courseName
                    : `${round.tournamentName} · ${round.courseName}`
                }
                linkText="Continue Round"
                onClick={() =>
                  navigate({
                    to: '/tournaments/$tournamentId/rounds/$roundId',
                    params: {
                      tournamentId: round.tournamentId,
                      roundId: round.roundId,
                    },
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Events</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardCard
            color="default"
            icon={PlusCircle}
            className="min-h-[220px]"
            title="Create Event"
            description="Set up a private event, customise rules, and invite your crew."
            linkText="Start Setup"
            onClick={() => setCreateExpanded(true)}
          />
          <DashboardCard
            color="default"
            icon={Trophy}
            className="min-h-[220px]"
            title="Join Tournament"
            description="Enter an invitational code to join an event."
            linkText="Browse Events"
            onClick={() => setJoinExpanded(true)}
          />
        </div>
        <button
          onClick={() => navigate({ to: '/tournaments' })}
          className="focus-visible:ring-primary mt-4 flex w-full items-center justify-end gap-1 py-1 focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
        >
          <Text size="sm" color="primary" weight="semibold">
            View all events
          </Text>
          <ChevronRight className="text-primary size-4" />
        </button>
      </section>

      <section>
        <SectionLabel>Library & Settings</SectionLabel>
        <div className="border-border/50 bg-card divide-border/50 divide-y overflow-hidden rounded-2xl border shadow-md shadow-black/5">
          <NavRow
            icon={Map}
            label="Courses"
            onClick={() => navigate({ to: '/courses' })}
          />
          <NavRow
            icon={Users}
            label="Guests"
            onClick={() => navigate({ to: '/guests' })}
          />
          <NavRow
            icon={Settings}
            label="Account"
            onClick={() => navigate({ to: '/account' })}
          />
        </div>
      </section>

      <Dialog open={joinExpanded} onOpenChange={setJoinExpanded}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Tournament</DialogTitle>
            <DialogDescription>
              Enter the invite code shared by the tournament commissioner
            </DialogDescription>
          </DialogHeader>
          <JoinTournamentForm
            open={joinExpanded}
            onComplete={() => setJoinExpanded(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={createExpanded} onOpenChange={setCreateExpanded}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Choose how you want to set up your event
            </DialogDescription>
          </DialogHeader>
          <CreateEventContent onClose={() => setCreateExpanded(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
