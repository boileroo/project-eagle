import { PageHeader } from '@/components/shared/page-header/page-header';
import { TournamentActions } from './tournament-actions/tournament-actions';
import { useNavigate, useRouter } from '@tanstack/react-router';
import type { TournamentLoaderData } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  setup: 'Draft',
  scheduled: 'Awaiting Start',
  underway: 'Underway',
  complete: 'Finished',
};

const STATUS_COLORS: Record<
  string,
  'default' | 'secondary' | 'outline' | 'warning'
> = {
  setup: 'outline',
  scheduled: 'secondary',
  underway: 'warning',
  complete: 'default',
};

type TournamentHeaderProps = {
  tournament: TournamentLoaderData;
  isCommissioner: boolean;
};

export function TournamentHeader({
  tournament,
  isCommissioner,
}: TournamentHeaderProps) {
  const router = useRouter();
  const navigate = useNavigate();

  const { description, name, status } = tournament;

  return (
    <PageHeader
      title={name}
      statusBadge={{
        label: STATUS_LABELS[status ?? 'setup'],
        variant: STATUS_COLORS[status ?? 'setup'],
      }}
      description={description ?? undefined}
      actions={
        <TournamentActions
          tournament={tournament}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
          onDeleted={() => navigate({ to: '/tournaments' })}
        />
      }
    />
  );
}
