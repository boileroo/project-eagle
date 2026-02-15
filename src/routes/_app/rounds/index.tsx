import { createFileRoute } from '@tanstack/react-router';
import { getSingleRoundsFn } from '@/lib/rounds.server';
import { RoundsPage } from '@/components/pages';

export const Route = createFileRoute('/_app/rounds/')({
  loader: async () => {
    const rounds = await getSingleRoundsFn();
    return { rounds };
  },
  component: function RoundsRoute() {
    const { rounds } = Route.useLoaderData();
    return <RoundsPage rounds={rounds} />;
  },
});
