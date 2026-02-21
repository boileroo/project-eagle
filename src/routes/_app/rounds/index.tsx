import { createFileRoute, redirect } from '@tanstack/react-router';

// Standalone rounds are now surfaced in the unified Events page at /tournaments.
// Redirect any visits to /rounds to /tournaments.
export const Route = createFileRoute('/_app/rounds/')({
  beforeLoad: () => {
    throw redirect({ to: '/tournaments' });
  },
});
