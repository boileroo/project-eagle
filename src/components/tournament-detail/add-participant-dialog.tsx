import { addParticipantFn } from '@/lib/tournaments.server';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { toast } from 'sonner';

export function AddParticipantDialog({
  tournamentId,
  onAdded,
}: {
  tournamentId: string;
  onAdded: () => void;
}) {
  return (
    <AddPlayerDialog
      tournamentId={tournamentId}
      onAddPerson={async (person) => {
        await addParticipantFn({
          data: { tournamentId, personId: person.id, role: 'player' },
        });
        toast.success('Player added!');
        onAdded();
      }}
      onAddGuest={async (personId, name) => {
        await addParticipantFn({
          data: { tournamentId, personId, role: 'player' },
        });
        toast.success(`${name} added as a guest!`);
        onAdded();
      }}
    />
  );
}
