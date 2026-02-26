import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type TournamentSummary } from '@/types';

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

interface SingleRoundCardProps {
  tournament: TournamentSummary;
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SingleRoundCard({ tournament }: SingleRoundCardProps) {
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
