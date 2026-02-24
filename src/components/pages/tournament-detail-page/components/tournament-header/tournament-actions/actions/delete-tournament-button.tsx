import { useState } from 'react';
import { deleteTournamentFn } from '@/lib/tournaments.server';
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

type DeleteTournamentButtonProps = {
  tournamentId: string;
  tournamentName: string;
  onDeleted: () => void;
};

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
  onDeleted,
}: DeleteTournamentButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournamentFn({ data: { tournamentId } });
      toast.success('Tournament deleted.');
      onDeleted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete tournament',
      );
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete tournament?</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{tournamentName}</strong> and
            all its participants, rounds, scores, and competitions. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
