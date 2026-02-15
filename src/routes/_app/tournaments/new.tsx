import { createFileRoute } from '@tanstack/react-router';
import { NewTournamentPage } from '@/components/pages';

export const Route = createFileRoute('/_app/tournaments/new')({
  component: NewTournamentPage,
});
