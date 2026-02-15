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

export function CompetitionResults({ result }: { result: CompetitionResult }) {
  switch (result.type) {
    case 'stableford':
      return <StablefordLeaderboard result={result.result} />;
    case 'stroke_play':
      return <StrokePlayLeaderboard result={result.result} />;
    case 'match_play':
      return <MatchPlayResults result={result.result} />;
    case 'best_ball':
      return <BestBallResults result={result.result} />;
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
// Match Play Results
// ──────────────────────────────────────────────

function MatchPlayResults({
  result,
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'match_play' }>['result']
  >;
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
            >
              {match.playerA.displayName}
            </span>
            <span className="text-muted-foreground text-xs">vs</span>
            <span
              className={`text-sm font-medium ${match.winner === 'B' ? 'text-primary' : ''}`}
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
}: {
  result: NonNullable<
    Extract<CompetitionResult, { type: 'best_ball' }>['result']
  >;
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
            >
              {match.teamA.name}
            </span>
            <span className="text-muted-foreground text-xs">vs</span>
            <span
              className={`text-sm font-medium ${match.winner === 'B' ? 'text-primary' : ''}`}
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
