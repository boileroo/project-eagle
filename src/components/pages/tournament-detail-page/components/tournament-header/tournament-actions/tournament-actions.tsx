import { ShareDialog } from '@/components/tournament-detail/share-dialog';
import { DeleteTournamentButton } from './actions/delete-tournament-button';
import { LockTournamentButton } from './actions/lock-tournament-button';
import { UnlockTournamentButton } from './actions/unlock-tournament-button';
import { EditTournamentLink } from './actions/edit-tournament-link';
import { getTournamentFn } from '@/lib/tournaments.server';

type TournamentLoaderData = Awaited<ReturnType<typeof getTournamentFn>>;

type TournamentActionsProps = {
  tournament: TournamentLoaderData;
  isCommissioner: boolean;
  onChanged: () => void;
  onDeleted: () => void;
};

export function TournamentActions({
  tournament,
  isCommissioner,
  onChanged,
  onDeleted,
}: TournamentActionsProps) {
  const { id, inviteCode, rounds, name, status } = tournament;

  const roundsCount = rounds.length;
  const isSetup = status === 'setup';
  const isScheduled = status === 'scheduled';

  if (!isCommissioner) return null;

  return (
    <div className="flex items-center gap-2">
      {isSetup && roundsCount > 0 && (
        <LockTournamentButton tournamentId={id} onLocked={onChanged} />
      )}

      {isScheduled && (
        <UnlockTournamentButton tournamentId={id} onUnlocked={onChanged} />
      )}

      <EditTournamentLink tournamentId={id} />

      <ShareDialog tournamentName={name} inviteCode={inviteCode} />

      {isSetup && (
        <DeleteTournamentButton
          tournamentId={id}
          tournamentName={name}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}
