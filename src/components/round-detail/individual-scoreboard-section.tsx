import { useSuspenseQuery } from '@tanstack/react-query';
import { getIndividualScoreboardFn } from '@/lib/competitions.server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ──────────────────────────────────────────────
// Individual Scoreboard Section
//
// Displays the auto-computed per-player scoreboard
// for a round: gross, net, stableford, bonus, total.
// Always shown when the round is open or finalized.
// ──────────────────────────────────────────────

type ScoreboardData = Awaited<ReturnType<typeof getIndividualScoreboardFn>>;

const BASIS_LABELS: Record<string, string> = {
  gross_strokes: 'Gross',
  net_strokes: 'Net',
  stableford: 'Stableford',
  total: 'Total',
};

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function IndividualScoreboardSection({ roundId }: { roundId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['individual-scoreboard', roundId],
    queryFn: () => getIndividualScoreboardFn({ data: { roundId } }),
  });

  const scoreboard = data as ScoreboardData;

  if (!scoreboard || scoreboard.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Individual Scoreboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No scores recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { rows, hasContributorBonuses, primaryScoringBasis } = scoreboard;
  const trophyCol = primaryScoringBasis;

  const colClass = (col: string) =>
    trophyCol === col
      ? 'font-semibold text-foreground'
      : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>Individual Scoreboard</span>
          {trophyCol && (
            <Badge variant="outline" className="gap-1 text-xs font-normal">
              <TrophyIcon className="h-3 w-3" />
              {BASIS_LABELS[trophyCol] ?? trophyCol}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground w-6 px-4 py-2 text-left font-medium">
                  #
                </th>
                <th className="px-4 py-2 text-left font-medium">Player</th>
                <th className="text-muted-foreground px-4 py-2 text-right font-medium">
                  HCP
                </th>
                <th
                  className={`px-4 py-2 text-right font-medium ${colClass('gross_strokes')}`}
                >
                  {trophyCol === 'gross_strokes' && (
                    <TrophyIcon className="mr-1 inline h-3 w-3" />
                  )}
                  Gross
                </th>
                <th
                  className={`px-4 py-2 text-right font-medium ${colClass('net_strokes')}`}
                >
                  {trophyCol === 'net_strokes' && (
                    <TrophyIcon className="mr-1 inline h-3 w-3" />
                  )}
                  Net
                </th>
                <th
                  className={`px-4 py-2 text-right font-medium ${colClass('stableford')}`}
                >
                  {trophyCol === 'stableford' && (
                    <TrophyIcon className="mr-1 inline h-3 w-3" />
                  )}
                  Stableford
                </th>
                {hasContributorBonuses && (
                  <th className="text-muted-foreground px-4 py-2 text-right font-medium">
                    Bonus
                  </th>
                )}
                {hasContributorBonuses && (
                  <th
                    className={`px-4 py-2 text-right font-medium ${colClass('total')}`}
                  >
                    {trophyCol === 'total' && (
                      <TrophyIcon className="mr-1 inline h-3 w-3" />
                    )}
                    Total
                  </th>
                )}
                <th className="text-muted-foreground px-4 py-2 text-right font-medium">
                  Holes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.roundParticipantId}
                  className="hover:bg-muted/30 border-b last:border-0"
                >
                  <td className="text-muted-foreground px-4 py-2 tabular-nums">
                    {row.rank}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.displayName}</span>
                      {row.standaloneBadges.map((badge) => (
                        <Badge
                          key={badge.competitionId}
                          variant="secondary"
                          className="text-xs font-normal"
                          title={badge.label}
                        >
                          {badge.shortLabel}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                    {row.playingHandicap}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${colClass('gross_strokes')}`}
                  >
                    {row.holesCompleted > 0 ? row.grossStrokes : '—'}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${colClass('net_strokes')}`}
                  >
                    {row.holesCompleted > 0 ? row.netStrokes : '—'}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${colClass('stableford')}`}
                  >
                    {row.stableford}
                  </td>
                  {hasContributorBonuses && (
                    <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                      {row.contributorBonusTotal > 0
                        ? `+${row.contributorBonusTotal}`
                        : '—'}
                    </td>
                  )}
                  {hasContributorBonuses && (
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${colClass('total')}`}
                    >
                      {row.total}
                    </td>
                  )}
                  <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                    {row.holesCompleted}/{scoreboard.totalHoles}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
