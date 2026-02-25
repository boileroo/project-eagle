import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TournamentCard } from './components/tournament-card';
import { SingleRoundCard } from './components/single-round-card';

type RoundData = {
  id: string;
  status: string;
  roundNumber: number | null;
  date: Date | null;
  teeTime: string | null;
  course: { id: string; name: string };
};

export type TournamentSummary = {
  id: string;
  name: string;
  description: string | null;
  status: 'setup' | 'scheduled' | 'underway' | 'complete';
  isSingleRound: boolean;
  participants: { id: string }[];
  rounds: RoundData[];
};

type Tab = 'active' | 'past';

function isActive(t: TournamentSummary): boolean {
  return t.status !== 'complete';
}

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
