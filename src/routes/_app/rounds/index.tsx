import { createFileRoute, Link } from '@tanstack/react-router';
import { getSingleRoundsFn } from '@/lib/rounds.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_app/rounds/')({
  loader: async () => {
    const rounds = await getSingleRoundsFn();
    return { rounds };
  },
  component: RoundsPage,
});

function RoundsPage() {
  const { rounds } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rounds</h1>
          <p className="text-muted-foreground">
            Your single rounds and casual games.
          </p>
        </div>
        <Button asChild>
          <Link to="/rounds/new">New Round</Link>
        </Button>
      </div>

      {rounds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No rounds yet. Start a new round to get going.
            </p>
            <Button asChild>
              <Link to="/rounds/new">New Round</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rounds.map((round) => (
            <Link
              key={round.id}
              to="/rounds/$roundId"
              params={{ roundId: round.id }}
              className="group"
            >
              <Card className="group-hover:border-primary/50 group-hover:bg-accent h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="group-hover:text-primary">
                      {round.course.name}
                    </span>
                  </CardTitle>
                  {round.date && (
                    <p className="text-muted-foreground text-sm">
                      {new Date(round.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {round.teeTime && ` · ${round.teeTime}`}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {round.participants.length} player
                      {round.participants.length !== 1 ? 's' : ''}
                    </Badge>
                    {round.status !== 'draft' && (
                      <Badge variant="outline">{round.status}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
