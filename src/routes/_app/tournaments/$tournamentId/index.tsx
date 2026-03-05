import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  tournamentLeaderboardQueryOptions,
  tournamentQueryOptions,
  myPersonQueryOptions,
  coursesQueryOptions,
} from '@/lib/query-options';
import { useAuth } from '@/hooks/use-auth';
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime';
import { TournamentDetailPage } from '@/components/pages';

export const Route = createFileRoute('/_app/tournaments/$tournamentId/')({
  loader: async ({ params, context }) => {
    const queryClient = context.queryClient;

    // Prefetch all data into query cache
    const tournament = await queryClient.ensureQueryData(
      tournamentQueryOptions(params.tournamentId),
    );

    await Promise.all([
      queryClient.ensureQueryData(myPersonQueryOptions()),
      queryClient.ensureQueryData(coursesQueryOptions()),
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

    return { tournamentId: params.tournamentId };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tournamentId } = Route.useParams();
  const { data: tournament } = useSuspenseQuery(
    tournamentQueryOptions(tournamentId),
  );
  const { data: myPerson } = useSuspenseQuery(myPersonQueryOptions());
  const { data: courses } = useSuspenseQuery(coursesQueryOptions());
  const { user, accessToken } = useAuth();

  useTournamentRealtime(tournamentId, accessToken);

  return (
    <TournamentDetailPage
      tournament={tournament}
      myPerson={myPerson}
      courses={courses}
      userId={user!.id}
    />
  );
}
