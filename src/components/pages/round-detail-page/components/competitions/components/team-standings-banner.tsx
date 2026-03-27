import { Trophy } from 'lucide-react';

interface TeamStandingEntry {
  teamId: string;
  teamName: string;
  points: number;
}

interface TeamStandingsBannerProps {
  standings: TeamStandingEntry[];
  roundStatus: 'open' | 'finalized';
  teamColours?: Map<string, string>;
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function TeamStandingsBanner({
  standings,
  roundStatus,
  teamColours,
}: TeamStandingsBannerProps) {
  if (standings.length < 2) return null;

  const sorted = [...standings].sort((a, b) => b.points - a.points);
  const topPoints = sorted[0].points;
  const isTied = sorted[1].points === topPoints;
  const isFinalized = roundStatus === 'finalized';

  if (standings.length === 2) {
    const [first, second] = sorted;
    const firstColour = teamColours?.get(first.teamId);
    const secondColour = teamColours?.get(second.teamId);

    return (
      <div className="bg-muted/40 mb-4 flex items-center gap-4 rounded-md border px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!isFinalized && (
            <span className="text-muted-foreground mr-2 text-sm">
              As it stands…
            </span>
          )}
          <span
            className={`min-w-0 truncate text-sm font-semibold ${!isTied ? 'text-primary' : ''}`}
            style={firstColour ? { color: firstColour } : undefined}
          >
            {first.teamName}
          </span>
          <div className="flex shrink-0 items-center gap-2 tabular-nums">
            <span className="text-base font-bold">
              {formatPoints(first.points)}
            </span>
            <span className="text-muted-foreground text-sm">–</span>
            <span className="text-muted-foreground text-base font-bold">
              {formatPoints(second.points)}
            </span>
          </div>
          <span
            className="text-muted-foreground min-w-0 truncate text-sm font-medium"
            style={secondColour ? { color: secondColour } : undefined}
          >
            {second.teamName}
          </span>
        </div>
        <div className="text-muted-foreground shrink-0 text-xs">
          {isTied ? (
            isFinalized ? (
              'Tied'
            ) : (
              'Level'
            )
          ) : isFinalized ? (
            <Trophy className="text-primary h-4 w-4" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 mb-4 space-y-1.5 rounded-md border px-4 py-3">
      {!isFinalized && (
        <div className="text-muted-foreground text-sm">As it stands…</div>
      )}
      {sorted.map((team, i) => {
        const isWinner = i === 0 && !isTied;
        const colour = teamColours?.get(team.teamId);
        return (
          <div key={team.teamId} className="flex items-center justify-between">
            <span
              className={`text-sm font-medium ${isWinner ? 'text-primary' : 'text-muted-foreground'}`}
              style={colour ? { color: colour } : undefined}
            >
              {team.teamName}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold tabular-nums ${isWinner ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {formatPoints(team.points)}
              </span>
              {isWinner && isFinalized && (
                <Trophy className="text-primary h-3.5 w-3.5" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
