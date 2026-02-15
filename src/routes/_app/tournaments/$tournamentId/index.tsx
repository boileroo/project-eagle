import { createFileRoute, redirect } from '@tanstack/react-router';
import { getTournamentFn, getMyPersonFn } from '@/lib/tournaments.server';
import { getCoursesFn } from '@/lib/courses.server';
import { getTournamentStandingsFn } from '@/lib/competitions.server';
import { useAuth } from '@/hooks/use-auth';
import { TournamentDetailPage } from '@/components/pages';

export const Route = createFileRoute('/_app/tournaments/$tournamentId/')({
  loader: async ({ params }) => {
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

    return { tournament, myPerson, courses, standings };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tournament, myPerson, courses, standings } = Route.useLoaderData();
  const { user } = useAuth();
  return (
    <TournamentDetailPage
      tournament={tournament}
      myPerson={myPerson}
      courses={courses}
      standings={standings}
      userId={user!.id}
    />
  );
}
