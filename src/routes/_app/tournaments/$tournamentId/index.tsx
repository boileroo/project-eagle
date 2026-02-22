import { createFileRoute, redirect } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import { getTournamentFn, getMyPersonFn } from '@/lib/tournaments.server';
import { getCoursesFn } from '@/lib/courses.server';
import {
  getTournamentStandingsFn,
  computeStandingsFn,
  getTournamentLeaderboardFn,
} from '@/lib/competitions.server';
import { useAuth } from '@/hooks/use-auth';
import { TournamentDetailPage } from '@/components/pages';

const tournamentLeaderboardQueryOptions = (tournamentId: string) =>
  queryOptions({
    queryKey: ['tournament-leaderboard', tournamentId],
    queryFn: () => getTournamentLeaderboardFn({ data: { tournamentId } }),
  });

export const Route = createFileRoute('/_app/tournaments/$tournamentId/')({
  loader: async ({ params, context }) => {
    const queryClient = context.queryClient;
    const [tournament, myPerson, courses, standings] = await Promise.all([
      getTournamentFn({ data: { tournamentId: params.tournamentId } }),
      getMyPersonFn(),
      getCoursesFn(),
      getTournamentStandingsFn({ data: { tournamentId: params.tournamentId } }),
    ]);

    // Single rounds should redirect straight to the round detail
    if (tournament.isSingleRound && tournament.rounds.length > 0) {
      throw redirect({
        to: '/tournaments/$tournamentId/rounds/$roundId',
        params: {
          tournamentId: tournament.id,
          roundId: tournament.rounds[0].id,
        },
      });
    }

    // Pre-compute all standings in parallel to eliminate client waterfall
    const computedStandings: Record<
      string,
      Awaited<ReturnType<typeof computeStandingsFn>>
    > = {};
    const standingResults = await Promise.allSettled(
      standings.map((s) => computeStandingsFn({ data: { standingId: s.id } })),
    );
    for (let i = 0; i < standings.length; i++) {
      const result = standingResults[i];
      if (result.status === 'fulfilled') {
        computedStandings[standings[i].id] = result.value;
      }
    }

    // Prefetch leaderboard into query cache for LeaderboardSection (useSuspenseQuery)
    await queryClient.ensureQueryData(
      tournamentLeaderboardQueryOptions(params.tournamentId),
    );

    return { tournament, myPerson, courses, standings, computedStandings };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tournament, myPerson, courses, standings, computedStandings } =
    Route.useLoaderData();
  const { user } = useAuth();
  return (
    <TournamentDetailPage
      tournament={tournament}
      myPerson={myPerson}
      courses={courses}
      standings={standings}
      computedStandings={computedStandings}
      userId={user!.id}
    />
  );
}
