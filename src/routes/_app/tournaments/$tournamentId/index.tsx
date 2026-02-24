import { createFileRoute, redirect } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import { getTournamentFn, getMyPersonFn } from '@/lib/tournaments.server';
import { getCoursesFn } from '@/lib/courses.server';
import { getTournamentLeaderboardFn } from '@/lib/competitions.server';
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
    const [tournament, myPerson, courses] = await Promise.all([
      getTournamentFn({ data: { tournamentId: params.tournamentId } }),
      getMyPersonFn(),
      getCoursesFn(),
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

    // Prefetch leaderboard into query cache for LeaderboardSection (useSuspenseQuery)
    await queryClient.ensureQueryData(
      tournamentLeaderboardQueryOptions(params.tournamentId),
    );

    return { tournament, myPerson, courses };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tournament, myPerson, courses } = Route.useLoaderData();
  const { user } = useAuth();
  return (
    <TournamentDetailPage
      tournament={tournament}
      myPerson={myPerson}
      courses={courses}
      userId={user!.id}
    />
  );
}
