import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PointLeaderboardProps {
  leaderboard: Array<{
    roundParticipantId: string;
    rank: number;
    displayName: string;
    holesCompleted: number;
    totalPoints: number;
  }>;
  participantTeamColours?: Map<string, string>;
}

export function PointLeaderboard({
  leaderboard,
  participantTeamColours,
}: PointLeaderboardProps) {
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
          <TableHead className="text-center">Holes</TableHead>
          <TableHead className="text-center font-bold">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaderboard.map((p) => (
          <TableRow key={p.roundParticipantId}>
            <TableCell className="font-medium">{p.rank}</TableCell>
            <TableCell
              style={
                participantTeamColours?.has(p.roundParticipantId)
                  ? { color: participantTeamColours.get(p.roundParticipantId) }
                  : undefined
              }
            >
              {p.displayName}
            </TableCell>
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
