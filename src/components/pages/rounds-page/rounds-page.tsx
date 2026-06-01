import { Link } from '@tanstack/react-router';
import type { RoundSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export function RoundsPage({ rounds }: { rounds: RoundSummary[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Rounds</Heading>
          <Text size="sm" color="muted">
            Your single rounds and casual games.
          </Text>
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
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{round.course.name}</span>
                  </CardTitle>
                  {round.date && (
                    <p className="text-muted-foreground text-sm">
                      {round.date.toLocaleDateString('en-GB', {
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
                      <Badge variant="secondary">{round.status}</Badge>
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
