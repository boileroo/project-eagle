// ──────────────────────────────────────────────
// Competition Results Component
//
// Renders leaderboard/results for any competition type.
// Purely presentational — receives pre-calculated results.
// ──────────────────────────────────────────────

import type { CompetitionResult } from '@/lib/domain';
import { PointLeaderboard } from './components/point-leaderboard';
import { StablefordLeaderboard } from './components/stableford-leaderboard';
import { StrokePlayLeaderboard } from './components/stroke-play-leaderboard';
import { MatchResults } from './components/match-results';
import { HiLoResults } from './components/hi-lo-results';
import { RumbleResults } from './components/rumble-results';

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
      return <MatchResults matches={result.result.matches} />;
    case 'best_ball':
      return <MatchResults matches={result.result.matches} />;
    case 'rumble':
      return (
        <RumbleResults
          teamResults={result.result.teamResults}
          resultText={result.result.resultText}
          teamColours={teamColours}
        />
      );
    case 'hi_lo':
      return <HiLoResults result={result.result} teamColours={teamColours} />;
    case 'six_point':
      return (
        <PointLeaderboard
          leaderboard={result.result.leaderboard}
          participantTeamColours={participantTeamColours}
        />
      );
    case 'chair':
      return (
        <PointLeaderboard
          leaderboard={result.result.leaderboard}
          participantTeamColours={participantTeamColours}
        />
      );
    case 'nearest_pin':
    case 'longest_drive':
      return null;
    default:
      return null;
  }
}
