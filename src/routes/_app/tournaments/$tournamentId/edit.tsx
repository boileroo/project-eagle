import { createFileRoute } from '@tanstack/react-router';
import { getTournamentFn } from '@/lib/tournaments.server';
import { EditTournamentPage } from '@/components/pages';
import { useAuth } from '@/hooks';

export const Route = createFileRoute('/_app/tournaments/$tournamentId/edit')({
  loader: async ({ params }) => {
    const tournament = await getTournamentFn({
      data: { tournamentId: params.tournamentId },
    });
    return { tournament };
  },
  component: function EditTournamentRoute() {
    const { tournament } = Route.useLoaderData();
    const { user } = useAuth();
    return (
      <EditTournamentPage
        tournament={tournament}
        isOwner={user?.id === tournament.createdByUserId}
      />
    );
  },
});
