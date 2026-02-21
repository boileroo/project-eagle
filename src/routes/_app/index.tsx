import { createFileRoute } from '@tanstack/react-router';
import { getActiveRoundsFn } from '@/lib/rounds.server';
import { DashboardPage } from '@/components/pages';

export const Route = createFileRoute('/_app/')({
  loader: async () => {
    const activeRounds = await getActiveRoundsFn();
    return { activeRounds };
  },
  component: function Home() {
    const { user } = Route.useRouteContext();
    const { activeRounds } = Route.useLoaderData();
    return (
      <DashboardPage userEmail={user.email!} activeRounds={activeRounds} />
    );
  },
});
