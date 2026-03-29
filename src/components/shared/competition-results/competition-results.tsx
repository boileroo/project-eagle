import type { CompetitionResult } from '@/lib/domain';
import { PointLeaderboard } from './components/point-leaderboard';
import { MatchResults } from './components/match-results';
import { HiLoResults } from './components/hi-lo-results';
import { RumbleResults } from './components/rumble-results';

export function CompetitionResults({
  result,
  participantTeamColours,
  teamColours,
  hideGroupHeaders,
}: {
  result: CompetitionResult;
  participantTeamColours?: Map<string, string>;
  teamColours?: Map<string, string>;
  hideGroupHeaders?: boolean;
}) {
  switch (result.type) {
    case 'match_play':
      return (
        <MatchResults
          matches={result.result.matches.map((m) => ({
            ...m,
            sideA: m.playerA.displayName,
            sideB: m.playerB.displayName,
          }))}
          hideGroupHeaders={hideGroupHeaders}
        />
      );
    case 'best_ball':
      return (
        <MatchResults
          matches={result.result.matches.map((m) => ({
            ...m,
            sideA: m.teamA.name,
            sideB: m.teamB.name,
            teamAPlayers: m.teamAPlayers,
            teamBPlayers: m.teamBPlayers,
          }))}
          hideGroupHeaders={hideGroupHeaders}
        />
      );
    case 'rumble':
      return (
        <RumbleResults
          teamResults={result.result.teamResults}
          teamColours={teamColours}
        />
      );
    case 'hi_lo':
      return (
        <HiLoResults
          result={result.result}
          teamColours={teamColours}
          hideGroupHeaders={hideGroupHeaders}
        />
      );
    case 'wolf':
      return (
        <PointLeaderboard
          leaderboard={result.result.leaderboard}
          participantTeamColours={participantTeamColours}
        />
      );
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
