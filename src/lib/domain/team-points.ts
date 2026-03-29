import type { CompetitionResult, TeamData } from './index';

export interface TeamPointsEntry {
  teamId: string;
  teamName: string;
  points: number;
}

/**
 * Extracts team points from a single competition result.
 *
 * For in-progress matches (best_ball, match_play) the live match lead
 * (matchScore / holes up) is used instead of the decided-only pointsA/B,
 * so the banner reflects the current state of play.
 *
 * Handles match_play (via player-to-team lookup), best_ball/hi_lo
 * (team info embedded in match result), and rumble (direct team results).
 * Returns an empty array for non-team formats.
 */
export function collectTeamPoints(
  result: CompetitionResult,
  teams: TeamData[],
): TeamPointsEntry[] {
  const totals = new Map<string, TeamPointsEntry>();

  const addPoints = (teamId: string, teamName: string, points: number) => {
    const existing = totals.get(teamId) ?? { teamId, teamName, points: 0 };
    existing.points += points;
    totals.set(teamId, existing);
  };

  const playerTeamMap = new Map<string, { teamId: string; teamName: string }>();
  for (const team of teams) {
    for (const memberId of team.memberParticipantIds) {
      playerTeamMap.set(memberId, { teamId: team.teamId, teamName: team.name });
    }
  }

  switch (result.type) {
    case 'match_play':
      for (const match of result.result.matches) {
        const teamA = playerTeamMap.get(match.playerA.roundParticipantId);
        const teamB = playerTeamMap.get(match.playerB.roundParticipantId);
        const scoreA = match.isDecided
          ? match.pointsA
          : Math.max(match.matchScore, 0);
        const scoreB = match.isDecided
          ? match.pointsB
          : Math.max(-match.matchScore, 0);
        if (teamA) addPoints(teamA.teamId, teamA.teamName, scoreA);
        if (teamB) addPoints(teamB.teamId, teamB.teamName, scoreB);
      }
      break;
    case 'best_ball':
      for (const match of result.result.matches) {
        const scoreA = match.isDecided
          ? match.pointsA
          : Math.max(match.matchScore, 0);
        const scoreB = match.isDecided
          ? match.pointsB
          : Math.max(-match.matchScore, 0);
        addPoints(match.teamA.teamId, match.teamA.name, scoreA);
        addPoints(match.teamB.teamId, match.teamB.name, scoreB);
      }
      break;
    case 'hi_lo':
      for (const match of result.result.matches) {
        addPoints(match.teamA.teamId, match.teamA.name, match.pointsA);
        addPoints(match.teamB.teamId, match.teamB.name, match.pointsB);
      }
      break;
    case 'rumble':
      for (const teamResult of result.result.teamResults) {
        addPoints(teamResult.teamId, teamResult.teamName, teamResult.points);
      }
      break;
    default:
      break;
  }

  return [...totals.values()];
}
