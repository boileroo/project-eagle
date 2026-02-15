import { createFileRoute, Link } from '@tanstack/react-router';
import { getTournamentsFn } from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_app/tournaments/')({
  loader: async () => {
    const tournaments = await getTournamentsFn();
    return { tournaments };
  },
  component: TournamentsPage,
});

function TournamentsPage() {
  const { tournaments } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground">
            Create and manage your tournaments.
          </p>
        </div>
        <Button asChild>
          <Link to="/tournaments/new">New Tournament</Link>
        </Button>
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No tournaments yet. Create your first one to get started.
            </p>
            <Button asChild>
              <Link to="/tournaments/new">New Tournament</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <Link
              key={tournament.id}
              to="/tournaments/$tournamentId"
              params={{ tournamentId: tournament.id }}
              className="group"
            >
              <Card className="group-hover:border-primary/50 group-hover:bg-accent h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="group-hover:text-primary">
                      {tournament.name}
                    </span>
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
          ))}
        </div>
      )}
    </div>
  );
}
