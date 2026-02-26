import { useUnlockTournament } from '@/lib/tournaments';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type UnlockTournamentButtonProps = {
  tournamentId: string;
  onUnlocked: () => void;
};

export function UnlockTournamentButton({
  tournamentId,
  onUnlocked,
}: UnlockTournamentButtonProps) {
  const [unlockTournament, { isPending }] = useUnlockTournament();

  const handleUnlock = async () => {
    await unlockTournament({
      variables: { tournamentId },
      onSuccess: () => {
        toast.success('Tournament unlocked. Back to draft.');
        onUnlocked();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Button variant="outline" onClick={handleUnlock} disabled={isPending}>
      {isPending ? 'Unlocking…' : 'Unlock Tournament'}
    </Button>
  );
}
