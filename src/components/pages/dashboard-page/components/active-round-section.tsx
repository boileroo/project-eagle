import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ActiveRound = {
  roundId: string;
  roundNumber: number | null;
  tournamentId: string;
  tournamentName: string;
  isSingleRound: boolean;
  courseName: string;
  participantCount: number;
  date: Date | null;
  teeTime: string | null;
};

interface ActiveRoundSectionProps {
  activeRounds: ActiveRound[];
}

export function ActiveRoundSection({ activeRounds }: ActiveRoundSectionProps) {
  if (activeRounds.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
        Resume
      </h2>
      {activeRounds.length === 1 ? (
        <Link
          to="/tournaments/$tournamentId/rounds/$roundId"
          params={{
            tournamentId: activeRounds[0].tournamentId,
            roundId: activeRounds[0].roundId,
          }}
          className="group block"
        >
          <Card className="border-primary/40 bg-primary/5 group-hover:bg-primary/10 border-l-4 transition-colors">
            <CardContent className="flex items-center justify-between p-5">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-lg font-semibold">
                  {activeRounds[0].courseName}
                  {!activeRounds[0].isSingleRound &&
                    activeRounds[0].roundNumber != null &&
                    ` — Round ${activeRounds[0].roundNumber}`}
                </p>
                {!activeRounds[0].isSingleRound && (
                  <p className="text-muted-foreground text-sm">
                    {activeRounds[0].tournamentName}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0">
                Live
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <div className="space-y-2">
          {activeRounds.map((round) => (
            <Link
              key={round.roundId}
              to="/tournaments/$tournamentId/rounds/$roundId"
              params={{
                tournamentId: round.tournamentId,
                roundId: round.roundId,
              }}
              className="group block"
            >
              <Card className="border-primary/30 group-hover:bg-primary/5 border-l-4 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {round.courseName}
                      {!round.isSingleRound &&
                        round.roundNumber != null &&
                        ` — Round ${round.roundNumber}`}
                    </p>
                    {!round.isSingleRound && (
                      <p className="text-muted-foreground truncate text-sm">
                        {round.tournamentName}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Live
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
