import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { getRoundFn } from '@/lib/rounds.server';
import { getTournamentFn, getMyPersonFn } from '@/lib/tournaments.server';
import { getCoursesFn } from '@/lib/courses.server';
import { getScorecardFn } from '@/lib/scores.server';
import { getRoundCompetitionsFn } from '@/lib/competitions.server';
import { useAuth } from '@/hooks/use-auth';
import { useScoreRealtime } from '@/hooks/use-score-realtime';
import { RoundDetailPage } from '@/components/pages';

const roundQueryOptions = (roundId: string) =>
  queryOptions({
    queryKey: ['round', roundId],
    queryFn: () => getRoundFn({ data: { roundId } }),
  });

const coursesQueryOptions = queryOptions({
  queryKey: ['course', 'list'],
  queryFn: () => getCoursesFn(),
});

const scorecardQueryOptions = (roundId: string) =>
  queryOptions({
    queryKey: ['round', roundId, 'scorecard'],
    queryFn: () => getScorecardFn({ data: { roundId } }),
  });

const competitionsQueryOptions = (roundId: string) =>
  queryOptions({
    queryKey: ['competition', 'round', roundId],
    queryFn: () => getRoundCompetitionsFn({ data: { roundId } }),
  });

const tournamentQueryOptions = (tournamentId: string) =>
  queryOptions({
    queryKey: ['tournament', tournamentId],
    queryFn: () => getTournamentFn({ data: { tournamentId } }),
  });

const myPersonQueryOptions = queryOptions({
  queryKey: ['tournament', 'me'],
  queryFn: () => getMyPersonFn(),
});

export const Route = createFileRoute(
  '/_app/tournaments/$tournamentId/rounds/$roundId/',
)({
  loader: async ({ params, context }) => {
    const queryClient = context.queryClient;

    const [round, courses, scorecard, competitions] = await Promise.all([
      queryClient.ensureQueryData(roundQueryOptions(params.roundId)),
      queryClient.ensureQueryData(coursesQueryOptions),
      queryClient.ensureQueryData(scorecardQueryOptions(params.roundId)),
      queryClient.ensureQueryData(competitionsQueryOptions(params.roundId)),
    ]);

    let tournament = null;
    let myPerson = null;
    if (round.tournament?.isSingleRound) {
      [tournament, myPerson] = await Promise.all([
        queryClient.ensureQueryData(tournamentQueryOptions(round.tournamentId)),
        queryClient.ensureQueryData(myPersonQueryOptions),
      ]);
    }

    return { round, courses, scorecard, competitions, tournament, myPerson };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { roundId, tournamentId } = Route.useParams();
  const { data: round } = useSuspenseQuery(roundQueryOptions(roundId));
  const { data: courses } = useSuspenseQuery(coursesQueryOptions);
  const { data: scorecard } = useSuspenseQuery(scorecardQueryOptions(roundId));
  const { data: competitions } = useSuspenseQuery(
    competitionsQueryOptions(roundId),
  );
  const shouldLoadTournament = round.tournament?.isSingleRound ?? false;
  const { data: tournament } = useQuery({
    ...tournamentQueryOptions(round.tournamentId),
    enabled: shouldLoadTournament,
  });
  const { data: myPerson } = useQuery({
    ...myPersonQueryOptions,
    enabled: shouldLoadTournament,
  });
  const { user, accessToken } = useAuth();

  useScoreRealtime(roundId, user!.id, accessToken);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      'project-eagle-active-round',
      JSON.stringify({ tournamentId, roundId }),
    );
  }, [roundId, tournamentId]);
  return (
    <RoundDetailPage
      round={round}
      courses={courses}
      scorecard={scorecard}
      competitions={competitions}
      tournament={shouldLoadTournament ? (tournament ?? null) : null}
      myPerson={shouldLoadTournament ? (myPerson ?? null) : null}
      userId={user!.id}
    />
  );
}
