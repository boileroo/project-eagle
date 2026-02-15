import { createFileRoute } from '@tanstack/react-router';
import { getTournamentsFn } from '@/lib/tournaments.server';
import { TournamentsPage } from '@/components/pages';

export const Route = createFileRoute('/_app/tournaments/')({
  loader: async () => {
    const tournaments = await getTournamentsFn();
    return { tournaments };
  },
  component: function TournamentsRoute() {
    const { tournaments } = Route.useLoaderData();
    return <TournamentsPage tournaments={tournaments} />;
  },
});
