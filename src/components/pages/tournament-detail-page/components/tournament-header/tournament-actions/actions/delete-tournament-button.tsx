import { useDeleteTournament } from '@/lib/tournaments';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
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
  const { open, setOpen, loading, handleConfirm } = useConfirmDialog();
  const [deleteTournament] = useDeleteTournament();

  const handleDelete = () =>
    handleConfirm(async () => {
      await deleteTournament({
        variables: { tournamentId },
        onSuccess: () => {
          toast.success('Tournament deleted.');
          onDeleted();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });
    });

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
            disabled={loading}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
