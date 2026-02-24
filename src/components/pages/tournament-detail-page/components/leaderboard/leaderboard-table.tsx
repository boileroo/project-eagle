import { TrophyIcon } from './trophy-icon';

type LeaderboardRow = {
  personId: string;
  displayName: string;
  rank: number;
  roundsPlayed: number;
  grossStrokes: number;
  netStrokes: number;
  stableford: number;
  total: number;
};

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  trophyCol: string;
};

export function LeaderboardTable({ rows, trophyCol }: LeaderboardTableProps) {
  const colClass = (col: string) =>
    trophyCol === col
      ? 'font-semibold text-foreground'
      : 'text-muted-foreground';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-muted-foreground w-6 px-4 py-2 text-left font-medium">
              #
            </th>
            <th className="px-4 py-2 text-left font-medium">Player</th>
            <th className="text-muted-foreground px-4 py-2 text-right font-medium">
              Rnds
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
            <th
              className={`px-4 py-2 text-right font-medium ${colClass('total')}`}
            >
              {trophyCol === 'total' && (
                <TrophyIcon className="mr-1 inline h-3 w-3" />
              )}
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.personId}
              className="hover:bg-muted/30 border-b last:border-0"
            >
              <td className="text-muted-foreground px-4 py-2 tabular-nums">
                {row.rank}
              </td>
              <td className="px-4 py-2 font-medium">{row.displayName}</td>
              <td className="text-muted-foreground px-4 py-2 text-right tabular-nums">
                {row.roundsPlayed}
              </td>
              <td
                className={`px-4 py-2 text-right tabular-nums ${colClass('gross_strokes')}`}
              >
                {row.grossStrokes}
              </td>
              <td
                className={`px-4 py-2 text-right tabular-nums ${colClass('net_strokes')}`}
              >
                {row.netStrokes}
              </td>
              <td
                className={`px-4 py-2 text-right tabular-nums ${colClass('stableford')}`}
              >
                {row.stableford}
              </td>
              <td
                className={`px-4 py-2 text-right tabular-nums ${colClass('total')}`}
              >
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
