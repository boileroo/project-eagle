import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface TournamentCardProps {
  tournament: TournamentSummary;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
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
