import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RumbleResultsProps {
  teamResults: Array<{
    teamId: string;
    teamName: string;
    groupResults: Array<unknown>;
    teamTotal: number;
    winner?: boolean;
  }>;
  teamColours?: Map<string, string>;
}

export function RumbleResults({
  teamResults,
  teamColours,
}: RumbleResultsProps) {
  if (teamResults.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No team results yet.</p>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead className="text-center font-bold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...teamResults]
            .sort((a, b) => b.teamTotal - a.teamTotal)
            .map((team) => (
              <TableRow key={team.teamId}>
                <TableCell
                  className={`font-medium ${team.winner ? 'text-primary' : ''}`}
                  style={
                    teamColours?.has(team.teamId)
                      ? { color: teamColours.get(team.teamId) }
                      : undefined
                  }
                >
                  {team.teamName}
                </TableCell>
                <TableCell className="text-center text-lg font-bold">
                  {team.teamTotal}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
