import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useScoreRealtime } from '@/hooks/use-score-realtime';
import { useRoundRealtime } from '@/hooks/use-round-realtime';
import { useActiveRound } from '@/hooks/use-active-round';
import {
  roundQueryOptions,
  coursesQueryOptions,
  scorecardQueryOptions,
  gamesQueryOptions,
  sideGamesQueryOptions,
  individualScoreboardQueryOptions,
  tournamentQueryOptions,
  myPersonQueryOptions,
} from '@/lib/query-options';
import { RoundDetailPage } from '@/components/pages';

export const Route = createFileRoute(
  '/_app/tournaments/$tournamentId/rounds/$roundId/',
)({
  loader: async ({ params, context }) => {
    const queryClient = context.queryClient;

    const [round, courses, scorecard, games, sideGames] = await Promise.all([
      queryClient.ensureQueryData(roundQueryOptions(params.roundId)),
      queryClient.ensureQueryData(coursesQueryOptions()),
      queryClient.ensureQueryData(scorecardQueryOptions(params.roundId)),
      queryClient.ensureQueryData(gamesQueryOptions(params.roundId)),
      queryClient.ensureQueryData(sideGamesQueryOptions(params.roundId)),
      queryClient.ensureQueryData(
        individualScoreboardQueryOptions(params.roundId),
      ),
    ]);

    // Always load tournament data for all rounds (not just single rounds)
    // This provides access to tournament-level players and teams
    const [tournament, myPerson] = await Promise.all([
      queryClient.ensureQueryData(tournamentQueryOptions(round.tournamentId)),
      queryClient.ensureQueryData(myPersonQueryOptions()),
    ]);

    return {
      round,
      courses,
      scorecard,
      games,
      sideGames,
      tournament,
      myPerson,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { roundId, tournamentId } = Route.useParams();
  const { data: round } = useSuspenseQuery(roundQueryOptions(roundId));
  const { data: courses } = useSuspenseQuery(coursesQueryOptions());
  const { data: scorecard } = useSuspenseQuery(scorecardQueryOptions(roundId));
  const { data: games } = useSuspenseQuery(gamesQueryOptions(roundId));
  const { data: sideGames } = useSuspenseQuery(sideGamesQueryOptions(roundId));
  // Always load tournament data for all rounds (not just single rounds)
  const { data: tournament } = useQuery(
    tournamentQueryOptions(round.tournamentId),
  );
  const { data: myPerson } = useQuery(myPersonQueryOptions());
  const { user, accessToken } = useAuth();

  useScoreRealtime(roundId, user!.id, accessToken);
  useRoundRealtime(roundId, accessToken);
  useActiveRound(tournamentId, roundId);

  return (
    <RoundDetailPage
      round={round}
      courses={courses}
      scorecard={scorecard}
      games={games}
      sideGames={sideGames}
      tournament={tournament ?? null}
      myPerson={myPerson ?? null}
      userId={user!.id}
    />
  );
}
