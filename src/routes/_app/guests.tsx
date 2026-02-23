import { createFileRoute } from '@tanstack/react-router';
import { getMyGuestsFn } from '@/lib/tournaments.server';
import { GuestsPage } from '@/components/pages';

export const Route = createFileRoute('/_app/guests')({
  loader: async () => {
    const guests = await getMyGuestsFn();
    return { guests };
  },
  component: function Guests() {
    const { guests } = Route.useLoaderData();
    return <GuestsPage guests={guests} />;
  },
});
