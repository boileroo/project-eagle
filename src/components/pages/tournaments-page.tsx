import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Status display helpers ──

const tournamentStatusLabels: Record<string, string> = {
  setup: 'Draft',
  scheduled: 'Scheduled',
  underway: 'Underway',
  complete: 'Finished',
};

const tournamentStatusColors: Record<
  string,
  'default' | 'secondary' | 'outline'
> = {
  setup: 'outline',
  scheduled: 'secondary',
  underway: 'secondary',
  complete: 'default',
};

const roundStatusLabels: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  open: 'Live',
  finalized: 'Finished',
};

const roundStatusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  scheduled: 'secondary',
  open: 'secondary',
  finalized: 'default',
};

// ── Types ──

type RoundData = {
  id: string;
  status: string;
  roundNumber: number | null;
  date: Date | null;
  teeTime: string | null;
  course: { id: string; name: string };
};

type TournamentSummary = {
  id: string;
  name: string;
  description: string | null;
  status: 'setup' | 'scheduled' | 'underway' | 'complete';
  isSingleRound: boolean;
  participants: { id: string }[];
  rounds: RoundData[];
};

// ── Filtering logic ──

type Tab = 'active' | 'past';

function isActive(t: TournamentSummary): boolean {
  return t.status !== 'complete';
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Component ──

export function TournamentsPage({
  tournaments,
}: {
  tournaments: TournamentSummary[];
}) {
  const [tab, setTab] = useState<Tab>('active');

  const active = tournaments.filter(isActive);
  const past = tournaments.filter((t) => !isActive(t));
  const displayed = tab === 'active' ? active : past;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">Your tournaments and rounds.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/rounds/new">Quick Round</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/tournaments/new">New Tournament</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'active'
              ? 'text-foreground border-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active
          {active.length > 0 && (
            <span className="text-muted-foreground ml-1.5">
              ({active.length})
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'past'
              ? 'text-foreground border-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Past
          {past.length > 0 && (
            <span className="text-muted-foreground ml-1.5">
              ({past.length})
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {displayed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {tab === 'active'
                ? 'No active events. Start a tournament or quick round to get going.'
                : 'No past events yet.'}
            </p>
            {tab === 'active' && (
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link to="/rounds/new">Quick Round</Link>
                </Button>
                <Button asChild>
                  <Link to="/tournaments/new">New Tournament</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((tournament) =>
            tournament.isSingleRound ? (
              <SingleRoundCard key={tournament.id} tournament={tournament} />
            ) : (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ── Tournament card ──

function TournamentCard({ tournament }: { tournament: TournamentSummary }) {
  return (
    <Link
      to="/tournaments/$tournamentId"
      params={{ tournamentId: tournament.id }}
      className="group"
    >
      <Card className="group-hover:bg-background h-full transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="truncate">{tournament.name}</span>
            <Badge variant={tournamentStatusColors[tournament.status]}>
              {tournamentStatusLabels[tournament.status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {tournament.participants.length} player
              {tournament.participants.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline">
              {tournament.rounds.length} round
              {tournament.rounds.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {tournament.description && (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
              {tournament.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Single round card ──

function SingleRoundCard({ tournament }: { tournament: TournamentSummary }) {
  const round = tournament.rounds[0];
  if (!round) return null;

  return (
    <Link
      to="/tournaments/$tournamentId/rounds/$roundId"
      params={{ tournamentId: tournament.id, roundId: round.id }}
      className="group"
    >
      <Card className="group-hover:bg-background h-full transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="truncate">{round.course.name}</span>
            <Badge variant={roundStatusColors[round.status]}>
              {roundStatusLabels[round.status]}
            </Badge>
          </CardTitle>
          {round.date && (
            <p className="text-muted-foreground text-sm">
              {formatDate(round.date)}
              {round.teeTime && ` · ${round.teeTime}`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {tournament.participants.length} player
              {tournament.participants.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
