import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks';
import { useScoreRealtime } from '@/hooks/use-score-realtime';
import {
  roundQueryOptions,
  scorecardQueryOptions,
  gamesQueryOptions,
  sideGamesQueryOptions,
} from '@/lib/query-options';
import { LiveScoringPage } from '@/components/pages';

export const Route = createFileRoute(
  '/_app/tournaments/$tournamentId/rounds/$roundId/play',
)({
  validateSearch: (search: Record<string, unknown>) => ({
    hole:
      typeof search.hole === 'number'
        ? search.hole
        : typeof search.hole === 'string'
          ? parseInt(search.hole, 10) || 1
          : 1,
    group: typeof search.group === 'string' ? search.group : undefined,
  }),

  loader: async ({ params, context }) => {
    const queryClient = context.queryClient;
    await Promise.all([
      queryClient.ensureQueryData(roundQueryOptions(params.roundId)),
      queryClient.ensureQueryData(scorecardQueryOptions(params.roundId)),
      queryClient.ensureQueryData(gamesQueryOptions(params.roundId)),
      queryClient.ensureQueryData(sideGamesQueryOptions(params.roundId)),
    ]);
  },

  component: RouteComponent,
});

function RouteComponent() {
  const { roundId } = Route.useParams();
  const { hole, group } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: round } = useSuspenseQuery(roundQueryOptions(roundId));
  const { data: scorecard } = useSuspenseQuery(scorecardQueryOptions(roundId));
  const { data: games } = useSuspenseQuery(gamesQueryOptions(roundId));
  const { data: sideGames } = useSuspenseQuery(sideGamesQueryOptions(roundId));
  const { user, accessToken } = useAuth();

  useScoreRealtime(roundId, user!.id, accessToken);

  const handleHoleChange = (newHole: number) => {
    void navigate({ search: (prev) => ({ ...prev, hole: newHole }) });
  };

  const handleGroupChange = (newGroupId: string) => {
    void navigate({ search: (prev) => ({ ...prev, group: newGroupId }) });
  };

  return (
    <LiveScoringPage
      round={round}
      scorecard={scorecard}
      games={games}
      sideGames={sideGames}
      userId={user!.id}
      currentHole={hole}
      selectedGroupId={group}
      onHoleChange={handleHoleChange}
      onGroupChange={handleGroupChange}
    />
  );
}
