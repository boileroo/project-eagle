import { useAddParticipant } from '@/lib/tournaments';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { toast } from 'sonner';

export function AddParticipantDialog({
  tournamentId,
  onAdded,
}: {
  tournamentId: string;
  onAdded: () => void;
}) {
  const [addParticipant] = useAddParticipant();

  return (
    <AddPlayerDialog
      tournamentId={tournamentId}
      onAddPerson={async (person) => {
        await addParticipant({
          variables: { tournamentId, personId: person.id, role: 'player' },
          onSuccess: () => {
            toast.success('Player added!');
            onAdded();
          },
          onError: (error) => {
            toast.error(error.message);
          },
        });
      }}
      onAddGuest={async (personId, name, _handicap) => {
        await addParticipant({
          variables: { tournamentId, personId, role: 'player' },
          onSuccess: () => {
            toast.success(`${name} added as a guest!`);
            onAdded();
          },
          onError: (error) => {
            toast.error(error.message);
          },
        });
      }}
    />
  );
}
