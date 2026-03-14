import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeaderboardData } from '@/types';
import { TrophyIcon } from '../trophy-icon';

type LeaderboardRow = LeaderboardData['rows'][number];
type LeaderboardRound = LeaderboardData['rounds'][number];

const BASIS_LABELS: Record<string, string> = {
  gross_strokes: 'Gross',
  net_strokes: 'Net',
  stableford: 'Stb',
  total: 'Tot',
};

function metricClass(primaryScoringBasis: string | null, column: string) {
  return primaryScoringBasis === column
    ? 'font-semibold text-foreground'
    : 'text-muted-foreground';
}

function renderRoundMetric(
  value: number | null,
  status: LeaderboardRow['roundCells'][number]['status'],
) {
  if (value !== null) return value;
  if (status === 'pending') return 'Pending';
  if (status === 'incomplete') return 'Inc';
  return '—';
}

export function IndividualLeaderboardTable({
  rows,
  rounds,
  primaryScoringBasis,
}: {
  rows: LeaderboardRow[];
  rounds: LeaderboardRound[];
  primaryScoringBasis: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1300px] border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="bg-background sticky left-0 z-20 w-12 px-3 py-3 text-left font-medium">
              #
            </th>
            <th className="bg-background sticky left-12 z-20 min-w-[220px] px-3 py-3 text-left font-medium">
              Player
            </th>
            <th className="text-muted-foreground px-3 py-3 text-right font-medium">
              Played
            </th>
            <th
              className={cn(
                'px-3 py-3 text-right font-medium',
                metricClass(primaryScoringBasis, 'gross_strokes'),
              )}
            >
              {primaryScoringBasis === 'gross_strokes' && (
                <TrophyIcon className="mr-1 inline h-3 w-3" />
              )}
              Gross
            </th>
            <th
              className={cn(
                'px-3 py-3 text-right font-medium',
                metricClass(primaryScoringBasis, 'net_strokes'),
              )}
            >
              {primaryScoringBasis === 'net_strokes' && (
                <TrophyIcon className="mr-1 inline h-3 w-3" />
              )}
              Net
            </th>
            <th
              className={cn(
                'px-3 py-3 text-right font-medium',
                metricClass(primaryScoringBasis, 'stableford'),
              )}
            >
              {primaryScoringBasis === 'stableford' && (
                <TrophyIcon className="mr-1 inline h-3 w-3" />
              )}
              Stableford
            </th>
            <th className="text-muted-foreground px-3 py-3 text-right font-medium">
              Bonus
            </th>
            <th
              className={cn(
                'px-3 py-3 text-right font-medium',
                metricClass(primaryScoringBasis, 'total'),
              )}
            >
              {primaryScoringBasis === 'total' && (
                <TrophyIcon className="mr-1 inline h-3 w-3" />
              )}
              Total
            </th>
            {rounds.map((round) => (
              <th
                key={round.roundId}
                colSpan={5}
                className="border-l px-3 py-3 text-left font-medium"
              >
                <div className="flex items-center gap-2">
                  <span>{round.roundName}</span>
                  {!round.isFinalised && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-normal"
                    >
                      Pending
                    </Badge>
                  )}
                </div>
              </th>
            ))}
          </tr>
          <tr className="bg-muted/20 border-b">
            <th className="bg-background sticky left-0 z-20 px-3 py-2" />
            <th className="bg-background sticky left-12 z-20 px-3 py-2" />
            <th className="px-3 py-2" />
            <th className="px-3 py-2" />
            <th className="px-3 py-2" />
            <th className="px-3 py-2" />
            <th className="px-3 py-2" />
            <th className="px-3 py-2" />
            {rounds.map((round) => (
              <>
                <th
                  key={`${round.roundId}-gross`}
                  className="text-muted-foreground border-l px-3 py-2 text-right font-medium"
                >
                  {BASIS_LABELS.gross_strokes}
                </th>
                <th
                  key={`${round.roundId}-net`}
                  className="text-muted-foreground px-3 py-2 text-right font-medium"
                >
                  {BASIS_LABELS.net_strokes}
                </th>
                <th
                  key={`${round.roundId}-stb`}
                  className="text-muted-foreground px-3 py-2 text-right font-medium"
                >
                  {BASIS_LABELS.stableford}
                </th>
                <th
                  key={`${round.roundId}-bonus`}
                  className="text-muted-foreground px-3 py-2 text-right font-medium"
                >
                  Bonus
                </th>
                <th
                  key={`${round.roundId}-total`}
                  className="text-muted-foreground px-3 py-2 text-right font-medium"
                >
                  {BASIS_LABELS.total}
                </th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.personId}
              className="hover:bg-muted/20 border-b align-top"
            >
              <td className="bg-background text-muted-foreground sticky left-0 z-10 px-3 py-3 tabular-nums">
                {row.rank}
              </td>
              <td className="bg-background sticky left-12 z-10 px-3 py-3">
                <div className="space-y-1">
                  <div className="font-medium">{row.displayName}</div>
                  <div className="text-muted-foreground text-xs">
                    Counted rounds: {row.roundsPlayed}
                  </div>
                </div>
              </td>
              <td className="text-muted-foreground px-3 py-3 text-right tabular-nums">
                {row.roundsPlayed}
              </td>
              <td
                className={cn(
                  'px-3 py-3 text-right tabular-nums',
                  metricClass(primaryScoringBasis, 'gross_strokes'),
                )}
              >
                {row.grossStrokes}
              </td>
              <td
                className={cn(
                  'px-3 py-3 text-right tabular-nums',
                  metricClass(primaryScoringBasis, 'net_strokes'),
                )}
              >
                {row.netStrokes}
              </td>
              <td
                className={cn(
                  'px-3 py-3 text-right tabular-nums',
                  metricClass(primaryScoringBasis, 'stableford'),
                )}
              >
                {row.stableford}
              </td>
              <td className="text-muted-foreground px-3 py-3 text-right tabular-nums">
                {row.contributorBonusTotal > 0
                  ? `+${row.contributorBonusTotal}`
                  : '—'}
              </td>
              <td
                className={cn(
                  'px-3 py-3 text-right tabular-nums',
                  metricClass(primaryScoringBasis, 'total'),
                )}
              >
                {row.total}
              </td>
              {row.roundCells.map((cell) => (
                <>
                  <td
                    key={`${row.personId}-${cell.roundId}-gross`}
                    className="border-l px-3 py-3 text-right tabular-nums"
                  >
                    {renderRoundMetric(cell.grossStrokes, cell.status)}
                  </td>
                  <td
                    key={`${row.personId}-${cell.roundId}-net`}
                    className="px-3 py-3 text-right tabular-nums"
                  >
                    {renderRoundMetric(cell.netStrokes, cell.status)}
                  </td>
                  <td
                    key={`${row.personId}-${cell.roundId}-stb`}
                    className="px-3 py-3 text-right tabular-nums"
                  >
                    {renderRoundMetric(cell.stableford, cell.status)}
                  </td>
                  <td
                    key={`${row.personId}-${cell.roundId}-bonus`}
                    className="text-muted-foreground px-3 py-3 text-right tabular-nums"
                  >
                    {cell.contributorBonusTotal
                      ? `+${cell.contributorBonusTotal}`
                      : cell.status === 'counted'
                        ? '—'
                        : renderRoundMetric(null, cell.status)}
                  </td>
                  <td
                    key={`${row.personId}-${cell.roundId}-total`}
                    className="px-3 py-3 text-right tabular-nums"
                  >
                    <div className="space-y-1">
                      <div>{renderRoundMetric(cell.total, cell.status)}</div>
                      {cell.standaloneBadges.length > 0 && (
                        <div className="flex justify-end gap-1">
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
                  </td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
