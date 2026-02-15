import { createFileRoute, redirect } from '@tanstack/react-router';
import { getRoundFn } from '@/lib/rounds.server';

export const Route = createFileRoute('/_app/rounds/$roundId')({
  loader: async ({ params }) => {
    const round = await getRoundFn({ data: { roundId: params.roundId } });
    throw redirect({
      to: '/tournaments/$tournamentId/rounds/$roundId',
      params: {
        tournamentId: round.tournamentId,
        roundId: round.id,
      },
    });
  },
});
