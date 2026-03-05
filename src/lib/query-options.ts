import { queryOptions } from '@tanstack/react-query';
import { getRoundFn } from './rounds.server';
import { getScorecardFn } from './scores.server';
import { getRoundCompetitionsFn } from './competitions.server';
import {
  getIndividualScoreboardFn,
  getTournamentLeaderboardFn,
} from './scoreboards.server';
import {
  getTournamentFn,
  getTournamentsFn,
  getTournamentByInviteCodeFn,
  getMyPersonFn,
} from './tournaments.server';
import { getCoursesFn, getCourseFn } from './courses.server';

export function roundQueryOptions(roundId: string) {
  return queryOptions({
    queryKey: ['round', roundId] as const,
    queryFn: () => getRoundFn({ data: { roundId } }),
  });
}

export function scorecardQueryOptions(roundId: string) {
  return queryOptions({
    queryKey: ['round', roundId, 'scorecard'] as const,
    queryFn: () => getScorecardFn({ data: { roundId } }),
  });
}

export function competitionsQueryOptions(roundId: string) {
  return queryOptions({
    queryKey: ['competition', 'round', roundId] as const,
    queryFn: () => getRoundCompetitionsFn({ data: { roundId } }),
  });
}

export function individualScoreboardQueryOptions(roundId: string) {
  return queryOptions({
    queryKey: ['individual-scoreboard', roundId] as const,
    queryFn: () => getIndividualScoreboardFn({ data: { roundId } }),
  });
}

export function tournamentLeaderboardQueryOptions(tournamentId: string) {
  return queryOptions({
    queryKey: ['tournament-leaderboard', tournamentId] as const,
    queryFn: () => getTournamentLeaderboardFn({ data: { tournamentId } }),
  });
}

export function tournamentQueryOptions(tournamentId: string) {
  return queryOptions({
    queryKey: ['tournament', tournamentId] as const,
    queryFn: () => getTournamentFn({ data: { tournamentId } }),
  });
}

export function myTournamentsQueryOptions() {
  return queryOptions({
    queryKey: ['tournament', 'me'] as const,
    queryFn: () => getTournamentsFn(),
  });
}

export function coursesQueryOptions() {
  return queryOptions({
    queryKey: ['course', 'list'] as const,
    queryFn: () => getCoursesFn(),
  });
}

export function courseQueryOptions(courseId: string) {
  return queryOptions({
    queryKey: ['course', courseId] as const,
    queryFn: () => getCourseFn({ data: { courseId } }),
  });
}

export function tournamentByInviteCodeQueryOptions(code: string) {
  return queryOptions({
    queryKey: ['tournament', 'invite-code', code] as const,
    queryFn: () => getTournamentByInviteCodeFn({ data: { code } }),
    retry: false,
  });
}

export function myPersonQueryOptions() {
  return queryOptions({
    queryKey: ['person', 'me'] as const,
    queryFn: () => getMyPersonFn(),
  });
}
