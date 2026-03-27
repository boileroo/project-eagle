import { Badge } from '@/components/ui/badge';

interface MatchResultsProps {
  matches: Array<{
    sideA: string;
    sideB: string;
    groupId?: string | null;
    groupName?: string | null;
    winner?: 'A' | 'B' | 'halved' | null;
    resultText: string;
    isDecided: boolean;
    holesCompleted: number;
    totalHoles: number;
    teamAPlayers?: Array<{ displayName: string }>;
    teamBPlayers?: Array<{ displayName: string }>;
  }>;
}

export function MatchResults({ matches }: MatchResultsProps) {
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
  ) => (
    <div
      key={key}
      className="flex items-center justify-between rounded-md border px-4 py-3"
    >
      <div className="flex flex-1 items-center gap-4">
        <div className="flex-1">
          <div
            className={`text-sm font-medium ${match.winner === 'A' ? 'text-primary' : ''}`}
          >
            {match.sideA}
          </div>
          {match.teamAPlayers && match.teamAPlayers.length > 0 && (
            <div className="text-muted-foreground mt-1 text-xs">
              {match.teamAPlayers.map((p) => p.displayName).join(', ')}
            </div>
          )}
        </div>
        <span className="text-muted-foreground text-xs">vs</span>
        <div className="flex-1">
          <div
            className={`text-sm font-medium ${match.winner === 'B' ? 'text-primary' : ''}`}
          >
            {match.sideB}
          </div>
          {match.teamBPlayers && match.teamBPlayers.length > 0 && (
            <div className="text-muted-foreground mt-1 text-xs">
              {match.teamBPlayers.map((p) => p.displayName).join(', ')}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={match.isDecided ? 'default' : 'secondary'}>
          {match.resultText}
        </Badge>
        {match.isDecided && (
          <span className="text-muted-foreground text-xs">
            ({match.holesCompleted}/{match.totalHoles})
          </span>
        )}
      </div>
    </div>
  );

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
