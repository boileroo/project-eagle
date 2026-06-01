import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Text } from '@/components/ui/text';
import type { LeaderboardData } from '@/types';

type RoundOutcome = LeaderboardData['roundOutcomes'][number];
type TeamLeaderboardRow = LeaderboardData['teamLeaderboard'][number];

export function CompetitionOutcomesSection({
  roundOutcomes,
  teamLeaderboard,
}: {
  roundOutcomes: RoundOutcome[];
  teamLeaderboard: TeamLeaderboardRow[];
}) {
  const teamRounds = roundOutcomes.filter((round) =>
    round.competitions.some((competition) => competition.category === 'team'),
  );
  const individualRounds = roundOutcomes.filter((round) =>
    round.competitions.some(
      (competition) => competition.category === 'individual',
    ),
  );

  if (teamLeaderboard.length === 0 && roundOutcomes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No team matches or additional game results yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {teamLeaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamLeaderboard.map((row) => (
                  <TableRow key={row.teamId}>
                    <TableCell className="font-medium">{row.rank}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{row.teamName}</div>
                        <div className="text-muted-foreground flex flex-wrap gap-1 text-xs">
                          {row.roundPoints.map((round) => (
                            <span key={round.roundId}>
                              {round.roundName.replace('Round ', 'R')}:{' '}
                              {round.points ?? '—'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.totalPoints}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {teamRounds.length > 0 && (
        <div className="space-y-3">
          <Text
            size="sm"
            weight="semibold"
            color="muted"
            className="tracking-[0.12em] uppercase"
          >
            Team matches and outcomes
          </Text>
          {teamRounds.map((round) => (
            <RoundOutcomeCard
              key={round.roundId}
              round={round}
              category="team"
            />
          ))}
        </div>
      )}

      {individualRounds.length > 0 && (
        <div className="space-y-3">
          <Text
            size="sm"
            weight="semibold"
            color="muted"
            className="tracking-[0.12em] uppercase"
          >
            Individual games
          </Text>
          {individualRounds.map((round) => (
            <RoundOutcomeCard
              key={`${round.roundId}-individual`}
              round={round}
              category="individual"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RoundOutcomeCard({
  round,
  category,
}: {
  round: RoundOutcome;
  category: 'individual' | 'team';
}) {
  const competitions = round.competitions.filter(
    (competition) => competition.category === category,
  );

  if (competitions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{round.roundName}</span>
          {!round.isFinalised && (
            <Badge variant="secondary" className="text-xs font-normal">
              Pending round
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {competitions.map((competition) => (
          <div
            key={competition.competitionId}
            className="rounded-lg border p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{competition.competitionName}</div>
              <Badge variant="outline" className="text-xs font-normal">
                {competition.formatLabel}
              </Badge>
            </div>
            <div className="mt-2 text-sm">{competition.headline}</div>
            {competition.details.length > 1 && (
              <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                {competition.details.map((detail) => (
                  <div key={detail}>{detail}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
