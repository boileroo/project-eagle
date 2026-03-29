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
  overallStandings?: TeamStandingEntry[];
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

export function TeamStandingsBanner({
  standings,
  roundStatus,
  teamColours,
  overallStandings,
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
      <div className="bg-muted/40 mb-4 flex items-center justify-between gap-4 rounded-md border px-4 py-3">
        {/* Left: Context (only if overall is present, otherwise full layout is used below) */}
        {!isFinalized && (
          <span className="text-muted-foreground shrink-0 text-sm">
            As it stands…
          </span>
        )}

        {/* Center: Teams flanking overall score */}
        <div className="flex flex-1 items-center justify-center gap-4 tabular-nums">
          <span
            className="min-w-0 truncate text-sm font-semibold"
            style={firstColour ? { color: firstColour } : undefined}
          >
            {first.teamName}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <div className="text-center">
              {overallStandings && (
                <div className="text-muted-foreground text-xs">Overall</div>
              )}
              <div className="text-2xl leading-tight font-bold">
                {overallStandings
                  ? formatPoints(
                      overallStandings.find((s) => s.teamId === first.teamId)
                        ?.points ?? 0,
                    )
                  : formatPoints(first.points)}
              </div>
            </div>
            <div className="text-muted-foreground text-sm">–</div>
            <div className="text-center">
              {overallStandings && (
                <div className="text-muted-foreground text-xs">Overall</div>
              )}
              <div className="text-muted-foreground text-2xl leading-tight font-bold">
                {overallStandings
                  ? formatPoints(
                      overallStandings.find((s) => s.teamId === second.teamId)
                        ?.points ?? 0,
                    )
                  : formatPoints(second.points)}
              </div>
            </div>
          </div>
          <span
            className="text-muted-foreground min-w-0 truncate text-sm font-semibold"
            style={secondColour ? { color: secondColour } : undefined}
          >
            {second.teamName}
          </span>
        </div>

        {/* Right: Session score (only if overall is present) */}
        {overallStandings && (
          <div className="flex shrink-0 items-center gap-3 text-right">
            <div className="text-muted-foreground text-xs">
              <div>Session</div>
              <div className="font-medium tabular-nums">
                {formatPoints(first.points)}
                {' – '}
                {formatPoints(second.points)}
              </div>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="text-muted-foreground shrink-0 text-xs">
          {isTied ? (
            isFinalized ? (
              <span>Tied</span>
            ) : (
              <span>Level</span>
            )
          ) : isFinalized ? (
            <Trophy className="text-primary h-4 w-4 shrink-0" />
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
      {overallStandings && (
        <div className="text-muted-foreground text-sm">
          Overall tournament points
        </div>
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
              {overallStandings && (
                <span className="text-muted-foreground ml-4 text-sm tabular-nums">
                  {formatPoints(
                    overallStandings.find((s) => s.teamId === team.teamId)
                      ?.points ?? 0,
                  )}
                </span>
              )}
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
