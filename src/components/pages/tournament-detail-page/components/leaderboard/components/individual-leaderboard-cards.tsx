import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrophyIcon } from '../trophy-icon';
import type { LeaderboardData } from '@/types';

type LeaderboardRow = LeaderboardData['rows'][number];

const BASIS_LABELS: Record<string, string> = {
  gross_strokes: 'Gross',
  net_strokes: 'Net',
  stableford: 'Stableford',
  total: 'Total',
};

function roundStatusText(cell: LeaderboardRow['roundCells'][number]) {
  if (cell.status === 'counted') return `${cell.total ?? 0} total`;
  if (cell.status === 'incomplete') {
    return `${cell.holesCompleted}/${cell.totalHoles} holes completed`;
  }
  if (cell.status === 'pending') return 'Round not finalised';
  return 'Did not count';
}

export function IndividualLeaderboardCards({
  rows,
  primaryScoringBasis,
}: {
  rows: LeaderboardRow[];
  primaryScoringBasis: string | null;
}) {
  return (
    <div className="space-y-3 px-6">
      {rows.map((row) => (
        <Card key={row.personId}>
          <CardContent className="space-y-4 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  #{row.rank} {row.displayName}
                </div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {row.roundsPlayed} counted round
                  {row.roundsPlayed !== 1 ? 's' : ''}
                </div>
              </div>
              {primaryScoringBasis && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <TrophyIcon className="h-3 w-3" />
                  {BASIS_LABELS[primaryScoringBasis] ?? primaryScoringBasis}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Gross</div>
                <div className="tabular-nums">{row.grossStrokes}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Net</div>
                <div className="tabular-nums">{row.netStrokes}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Stableford</div>
                <div className="tabular-nums">{row.stableford}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-muted-foreground text-xs">Total</div>
                <div className="tabular-nums">{row.total}</div>
              </div>
            </div>

            <div className="space-y-2">
              {row.roundCells.map((cell) => (
                <div
                  key={cell.roundId}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{cell.roundName}</div>
                      <div className="text-muted-foreground text-xs">
                        {roundStatusText(cell)}
                      </div>
                    </div>
                    {cell.status === 'counted' && (
                      <div className="text-muted-foreground text-right text-xs">
                        <div>Gross {cell.grossStrokes}</div>
                        <div>Net {cell.netStrokes}</div>
                        <div>Stb {cell.stableford}</div>
                      </div>
                    )}
                  </div>
                  {cell.standaloneBadges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {cell.standaloneBadges.map((badge) => (
                        <Badge
                          key={badge.competitionId}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {badge.shortLabel}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
