import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { TournamentCard } from './components/tournament-card';
import { SingleRoundCard } from './components/single-round-card';
import { EventSection } from './components/event-section';
import { type TournamentSummary } from '@/types';

type Tab = 'active' | 'past';

function isActive(t: TournamentSummary): boolean {
  return t.status !== 'complete';
}

function filterByStatus(items: TournamentSummary[], active: boolean) {
  return items.filter((t) => isActive(t) === active);
}

export function TournamentsPage({
  tournaments,
}: {
  tournaments: TournamentSummary[];
}) {
  const [tab, setTab] = useState<Tab>('active');

  const activeRounds = filterByStatus(
    tournaments.filter((t) => t.isSingleRound),
    true,
  );
  const activeTournaments = filterByStatus(
    tournaments.filter((t) => !t.isSingleRound),
    true,
  );
  const pastRounds = filterByStatus(
    tournaments.filter((t) => t.isSingleRound),
    false,
  );
  const pastTournaments = filterByStatus(
    tournaments.filter((t) => !t.isSingleRound),
    false,
  );

  const activeCount = activeRounds.length + activeTournaments.length;
  const pastCount = pastRounds.length + pastTournaments.length;

  const isTabEmpty = tab === 'active' ? activeCount === 0 : pastCount === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Events</Heading>
          <Text size="sm" color="muted">
            Your tournaments and rounds.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rounds/new">Quick Round</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/tournaments/new">New Tournament</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setTab('active')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'active'
              ? 'bg-surface-high text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Active
          {activeCount > 0 && (
            <span className="text-muted-foreground ml-1.5">
              ({activeCount})
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('past')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'past'
              ? 'bg-surface-high text-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Past
          {pastCount > 0 && (
            <span className="text-muted-foreground ml-1.5">({pastCount})</span>
          )}
        </button>
      </div>

      {/* Content */}
      {isTabEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {tab === 'active'
                ? 'No active events. Start a tournament or quick round to get going.'
                : 'No past events yet.'}
            </p>
            {tab === 'active' && (
              <div className="flex gap-2">
                <Button variant="ghost" asChild>
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
        <div className="space-y-8">
          {tab === 'active' ? (
            <>
              <EventSection
                title="Rounds"
                count={activeRounds.length}
                emptyMessage="No active rounds."
              >
                {activeRounds.map((tournament) => (
                  <SingleRoundCard
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
              </EventSection>

              <EventSection
                title="Tournaments"
                count={activeTournaments.length}
                emptyMessage="No active tournaments."
              >
                {activeTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </EventSection>
            </>
          ) : (
            <>
              <EventSection
                title="Rounds"
                count={pastRounds.length}
                emptyMessage="No past rounds."
              >
                {pastRounds.map((tournament) => (
                  <SingleRoundCard
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
              </EventSection>

              <EventSection
                title="Tournaments"
                count={pastTournaments.length}
                emptyMessage="No past tournaments."
              >
                {pastTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </EventSection>
            </>
          )}
        </div>
      )}
    </div>
  );
}
