import { Badge } from '@/components/ui/badge';

interface HiLoResultsProps {
  result: {
    matches: Array<{
      groupId?: string | null;
      groupName?: string | null;
      winner?: 'A' | 'B' | 'halved' | null;
      resultText: string;
      holesCompleted: number;
      totalHoles: number;
      teamA: { teamId: string };
      teamB: { teamId: string };
      teamAPlayers: Array<{ displayName: string }>;
      teamBPlayers: Array<{ displayName: string }>;
    }>;
  };
  teamColours?: Map<string, string>;
}

export function HiLoResults({ result, teamColours }: HiLoResultsProps) {
  const matches = result.matches;

  if (matches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No matches configured.</p>
    );
  }

  const matchesWithGroup = matches.filter((m) => m.groupId);
  const matchesWithoutGroup = matches.filter((m) => !m.groupId);

  const groupedMatches = matchesWithGroup.reduce((acc, match) => {
    const key = match.groupId ?? 'unknown';
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(match);
    return acc;
  }, new Map<string, typeof matches>());

  const renderMatch = (
    match: (typeof matches)[number],
    key: number | string,
  ) => {
    const teamAPlayers = match.teamAPlayers
      .map((p) => p.displayName)
      .join(' & ');
    const teamBPlayers = match.teamBPlayers
      .map((p) => p.displayName)
      .join(' & ');
    return (
      <div
        key={key}
        className="flex items-center justify-between rounded-md border px-4 py-3"
      >
        <div className="flex flex-1 items-center gap-3">
          <span
            className={`text-sm font-medium ${match.winner === 'A' ? 'text-primary' : ''}`}
            style={
              teamColours?.has(match.teamA.teamId)
                ? { color: teamColours.get(match.teamA.teamId) }
                : undefined
            }
          >
            {teamAPlayers}
          </span>
          <span className="text-muted-foreground text-xs">vs</span>
          <span
            className={`text-sm font-medium ${match.winner === 'B' ? 'text-primary' : ''}`}
            style={
              teamColours?.has(match.teamB.teamId)
                ? { color: teamColours.get(match.teamB.teamId) }
                : undefined
            }
          >
            {teamBPlayers}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              match.winner !== null && match.winner !== 'halved'
                ? 'default'
                : 'secondary'
            }
          >
            {match.resultText}
          </Badge>
          <span className="text-muted-foreground text-xs">
            ({match.holesCompleted}/{match.totalHoles})
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {Array.from(groupedMatches.entries()).map(([groupId, groupMatches]) => (
        <div key={groupId}>
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">
            {groupMatches[0]?.groupName ?? `Group ${groupId.slice(0, 8)}`}
          </h4>
          <div className="space-y-2">
            {groupMatches.map((match, i) =>
              renderMatch(match, `${groupId}-${i}`),
            )}
          </div>
        </div>
      ))}
      {matchesWithoutGroup.length > 0 && (
        <div className="space-y-2">
          {matchesWithoutGroup.map((match, i) =>
            renderMatch(match, `no-group-${i}`),
          )}
        </div>
      )}
    </div>
  );
}
