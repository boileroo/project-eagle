import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StablefordLeaderboardProps {
  result: {
    leaderboard: Array<{
      roundParticipantId: string;
      rank: number;
      displayName: string;
      playingHandicap: number | null;
      holesCompleted: number;
      totalPoints: number;
    }>;
  };
}

export function StablefordLeaderboard({ result }: StablefordLeaderboardProps) {
  const leaderboard = result.leaderboard;

  if (leaderboard.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No scores entered yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-center">HC</TableHead>
          <TableHead className="text-center">Holes</TableHead>
          <TableHead className="text-center font-bold">Points</TableHead>
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
            <TableCell className="text-center text-lg font-bold">
              {p.totalPoints}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
