// ──────────────────────────────────────────────
// Competition Results Component
//
// Renders leaderboard/results for any competition type.
// Purely presentational — receives pre-calculated results.
// ──────────────────────────────────────────────

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CompetitionResult } from '@/lib/domain';

export function CompetitionResults({
  result,
  participantTeamColours,
  teamColours,
}: {
  result: CompetitionResult;
  participantTeamColours?: Map<string, string>;
  teamColours?: Map<string, string>;
}) {
  switch (result.type) {
    case 'stableford':
      return <StablefordLeaderboard result={result.result} />;
    case 'stroke_play':
      return <StrokePlayLeaderboard result={result.result} />;
    case 'match_play':
      return (
        <MatchPlayResults
          result={result.result}
          participantTeamColours={participantTeamColours}
        />
      );
    case 'best_ball':
      return (
        <BestBallResults result={result.result} teamColours={teamColours} />
      );
    case 'rumble':
      return <RumbleResults result={result.result} teamColours={teamColours} />;
    case 'hi_lo':
      return <HiLoResults result={result.result} teamColours={teamColours} />;
    case 'six_point':
      return (
        <SixPointLeaderboard
          result={result.result}
          participantTeamColours={participantTeamColours}
        />
      );
    case 'chair':
      return (
        <ChairLeaderboard
          result={result.result}
          participantTeamColours={participantTeamColours}
        />
      );
    case 'nearest_pin':
    case 'longest_drive':
      return null; // Bonus comps rendered separately
    default:
      return null;
  }
}

// ──────────────────────────────────────────────
// Stableford Leaderboard
// ──────────────────────────────────────────────

function StablefordLeaderboard({
  result,
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'stableford' }>['result']
  >;
}) {
  if (result.leaderboard.length === 0) {
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
        {result.leaderboard.map((p) => (
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

// ──────────────────────────────────────────────
// Stroke Play Leaderboard
// ──────────────────────────────────────────────

function StrokePlayLeaderboard({
  result,
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'stroke_play' }>['result']
  >;
}) {
  if (result.leaderboard.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No scores entered yet.</p>
    );
  }

  const isNet = result.scoringBasis === 'net_strokes';

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
        {result.leaderboard.map((p) => (
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

function formatRelativeToPar(rel: number): string {
  if (rel === 0) return 'E';
  return rel > 0 ? `+${rel}` : `${rel}`;
}

// ──────────────────────────────────────────────
// Hi-Lo Results
// ──────────────────────────────────────────────

function HiLoResults({
  result,
  teamColours,
}: {
  result: NonNullable<Extract<CompetitionResult, { type: 'hi_lo' }>['result']>;
  teamColours?: Map<string, string>;
}) {
  if (result.matches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No matches configured.</p>
    );
  }

  return (
    <div className="space-y-3">
      {result.matches.map((match, i) => (
        <div
          key={i}
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
              {match.teamA.name}
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
              {match.teamB.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={match.winner !== null ? 'default' : 'secondary'}>
              {match.resultText}
            </Badge>
            <span className="text-muted-foreground text-xs">
              ({match.holesCompleted}/{match.totalHoles})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Six Point Leaderboard
// ──────────────────────────────────────────────

function SixPointLeaderboard({
  result,
  participantTeamColours,
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'six_point' }>['result']
  >;
  participantTeamColours?: Map<string, string>;
}) {
  if (result.leaderboard.length === 0) {
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
        {result.leaderboard.map((p) => (
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

// ──────────────────────────────────────────────
// Chair Leaderboard
// ──────────────────────────────────────────────

function ChairLeaderboard({
  result,
  participantTeamColours,
}: {
  result: NonNullable<Extract<CompetitionResult, { type: 'chair' }>['result']>;
  participantTeamColours?: Map<string, string>;
}) {
  if (result.leaderboard.length === 0) {
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
        {result.leaderboard.map((p) => (
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

// ──────────────────────────────────────────────
// Rumble Results
// ──────────────────────────────────────────────

function RumbleResults({
  result,
  teamColours,
}: {
  result: NonNullable<Extract<CompetitionResult, { type: 'rumble' }>['result']>;
  teamColours?: Map<string, string>;
}) {
  if (result.teamResults.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No team results yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-xs">{result.resultText}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">Groups</TableHead>
            <TableHead className="text-center font-bold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...result.teamResults]
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
                <TableCell className="text-muted-foreground text-center">
                  {team.groupResults.length}
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

// ──────────────────────────────────────────────
// Match Play Results
// ──────────────────────────────────────────────

function MatchPlayResults({
  result,
  participantTeamColours,
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'match_play' }>['result']
  >;
  participantTeamColours?: Map<string, string>;
}) {
  if (result.matches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No matches configured.</p>
    );
  }

  return (
    <div className="space-y-3">
      {result.matches.map((match, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-md border px-4 py-3"
        >
          <div className="flex flex-1 items-center gap-3">
            <span
              className={`text-sm font-medium ${match.winner === 'A' ? 'text-primary' : ''}`}
              style={
                participantTeamColours?.has(match.playerA.roundParticipantId)
                  ? {
                      color: participantTeamColours.get(
                        match.playerA.roundParticipantId,
                      ),
                    }
                  : undefined
              }
            >
              {match.playerA.displayName}
            </span>
            <span className="text-muted-foreground text-xs">vs</span>
            <span
              className={`text-sm font-medium ${match.winner === 'B' ? 'text-primary' : ''}`}
              style={
                participantTeamColours?.has(match.playerB.roundParticipantId)
                  ? {
                      color: participantTeamColours.get(
                        match.playerB.roundParticipantId,
                      ),
                    }
                  : undefined
              }
            >
              {match.playerB.displayName}
            </span>
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
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Best Ball Results
// ──────────────────────────────────────────────

function BestBallResults({
  result,
  teamColours,
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'best_ball' }>['result']
  >;
  teamColours?: Map<string, string>;
}) {
  if (result.matches.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No team matches configured.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {result.matches.map((match, i) => (
        <div
          key={i}
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
              {match.teamA.name}
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
              {match.teamB.name}
            </span>
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
      ))}
    </div>
  );
}
