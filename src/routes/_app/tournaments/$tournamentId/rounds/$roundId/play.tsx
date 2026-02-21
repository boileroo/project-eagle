import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { getRoundFn } from '@/lib/rounds.server';
import { getScorecardFn } from '@/lib/scores.server';
import { getRoundCompetitionsFn } from '@/lib/competitions.server';
import { useAuth } from '@/hooks';
import { useScoreRealtime } from '@/hooks/use-score-realtime';
import { LiveScoringPage } from '@/components/pages';

// ──────────────────────────────────────────────
// Query options (reuse same keys as round detail)
// ──────────────────────────────────────────────

const roundQueryOptions = (roundId: string) =>
  queryOptions({
    queryKey: ['round', roundId],
    queryFn: () => getRoundFn({ data: { roundId } }),
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

// ──────────────────────────────────────────────
// Route definition
// ──────────────────────────────────────────────

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
      queryClient.ensureQueryData(competitionsQueryOptions(params.roundId)),
    ]);
  },

  component: RouteComponent,
});

// ──────────────────────────────────────────────
// Route component
// ──────────────────────────────────────────────

function RouteComponent() {
  const { roundId } = Route.useParams();
  const { hole, group } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: round } = useSuspenseQuery(roundQueryOptions(roundId));
  const { data: scorecard } = useSuspenseQuery(scorecardQueryOptions(roundId));
  const { data: competitions } = useSuspenseQuery(
    competitionsQueryOptions(roundId),
  );
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
      competitions={competitions}
      userId={user!.id}
      currentHole={hole}
      selectedGroupId={group}
      onHoleChange={handleHoleChange}
      onGroupChange={handleGroupChange}
    />
  );
}
