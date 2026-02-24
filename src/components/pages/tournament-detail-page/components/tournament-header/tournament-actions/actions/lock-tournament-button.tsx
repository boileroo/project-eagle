import { useState } from 'react';
import { lockTournamentFn } from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type LockTournamentButtonProps = {
  tournamentId: string;
  onLocked: () => void;
};

export function LockTournamentButton({
  tournamentId,
  onLocked,
}: LockTournamentButtonProps) {
  const [locking, setLocking] = useState(false);
  const [open, setOpen] = useState(false);

  const handleLock = async () => {
    setLocking(true);
    try {
      await lockTournamentFn({ data: { tournamentId } });
      toast.success('Tournament locked. Rounds are now awaiting start.');
      setOpen(false);
      onLocked();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to lock tournament',
      );
    }
    setLocking(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Lock Tournament</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lock tournament?</DialogTitle>
          <DialogDescription>
            All draft rounds will be moved to &quot;scheduled&quot;. Players,
            teams, and rounds will be locked from editing until you unlock.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleLock} disabled={locking}>
            {locking ? 'Locking…' : 'Lock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
