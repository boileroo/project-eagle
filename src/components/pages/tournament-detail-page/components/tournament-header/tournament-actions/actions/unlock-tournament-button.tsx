import { useState } from 'react';
import { unlockTournamentFn } from '@/lib/tournaments.server';
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
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      await unlockTournamentFn({ data: { tournamentId } });
      toast.success('Tournament unlocked. Back to draft.');
      onUnlocked();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to unlock tournament',
      );
    }
    setUnlocking(false);
  };

  return (
    <Button variant="outline" onClick={handleUnlock} disabled={unlocking}>
      {unlocking ? 'Unlocking…' : 'Unlock Tournament'}
    </Button>
  );
}
