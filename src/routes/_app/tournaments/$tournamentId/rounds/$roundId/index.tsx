import { createFileRoute } from '@tanstack/react-router';
import { getRoundFn } from '@/lib/rounds.server';
import { getTournamentFn, getMyPersonFn } from '@/lib/tournaments.server';
import { getCoursesFn } from '@/lib/courses.server';
import { getScorecardFn } from '@/lib/scores.server';
import { getRoundCompetitionsFn } from '@/lib/competitions.server';
import { useAuth } from '@/hooks/use-auth';
import { RoundDetailPage } from '@/components/pages';

export const Route = createFileRoute(
  '/_app/tournaments/$tournamentId/rounds/$roundId/',
)({
  loader: async ({ params }) => {
    const [round, courses, scorecard, competitions] = await Promise.all([
      getRoundFn({ data: { roundId: params.roundId } }),
      getCoursesFn(),
      getScorecardFn({ data: { roundId: params.roundId } }),
      getRoundCompetitionsFn({
        data: { roundId: params.roundId },
      }),
    ]);

    let tournament = null;
    let myPerson = null;
    if (round.tournament?.isSingleRound) {
      [tournament, myPerson] = await Promise.all([
        getTournamentFn({ data: { tournamentId: round.tournamentId } }),
        getMyPersonFn(),
      ]);
    }

    return { round, courses, scorecard, competitions, tournament, myPerson };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const { user } = useAuth();
  return <RoundDetailPage {...data} userId={user!.id} />;
}
