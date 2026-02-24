import { Badge } from '@/components/ui/badge';
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
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <Badge variant={STATUS_COLORS[status ?? 'setup']}>
            {STATUS_LABELS[status ?? 'setup']}
          </Badge>
        </div>

        <TournamentActions
          tournament={tournament}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
          onDeleted={() => navigate({ to: '/tournaments' })}
        />
      </div>

      {description && <p className="text-muted-foreground">{description}</p>}
    </>
  );
}
