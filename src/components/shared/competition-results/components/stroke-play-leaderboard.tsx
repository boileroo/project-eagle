import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatRelativeToPar(rel: number): string {
  if (rel === 0) return 'E';
  return rel > 0 ? `+${rel}` : `${rel}`;
}

interface StrokePlayLeaderboardProps {
  result: {
    leaderboard: Array<{
      roundParticipantId: string;
      rank: number;
      displayName: string;
      playingHandicap: number | null;
      holesCompleted: number;
      grossTotal: number;
      rankingScore: number;
      relativeToPar: number;
    }>;
    scoringBasis?: 'gross_strokes' | 'net_strokes';
  };
}

export function StrokePlayLeaderboard({ result }: StrokePlayLeaderboardProps) {
  const leaderboard = result.leaderboard;
  const scoringBasis = result.scoringBasis ?? 'gross_strokes';

  if (leaderboard.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No scores entered yet.</p>
    );
  }

  const isNet = scoringBasis === 'net_strokes';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-center">HC</TableHead>
          <TableHead className="text-center">Holes</TableHead>
          {isNet && <TableHead className="text-center">Gross</TableHead>}
          <TableHead className="text-center font-bold">
            {isNet ? 'Net' : 'Gross'}
          </TableHead>
          <TableHead className="text-center">vs Par</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaderboard.map((p) => (
          <TableRow key={p.roundParticipantId}>
            <TableCell className="font-medium">{p.rank}</TableCell>
            <TableCell>{p.displayName}</TableCell>
            <TableCell className="text-center">{p.playingHandicap}</TableCell>
            <TableCell className="text-muted-foreground text-center">
              {p.holesCompleted}
            </TableCell>
            {isNet && (
              <TableCell className="text-muted-foreground text-center">
                {p.grossTotal}
              </TableCell>
            )}
            <TableCell className="text-center text-lg font-bold">
              {p.rankingScore}
            </TableCell>
            <TableCell className="text-center">
              {formatRelativeToPar(p.relativeToPar)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
