import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteRoundFn } from '@/lib/rounds.server';
import { deleteTournamentFn } from '@/lib/tournaments.server';
import { toast } from 'sonner';

interface DeleteRoundDialogProps {
  roundId: string;
  tournamentId: string;
  roundNumber?: number | null;
  isSingleRound: boolean;
  isCommissioner: boolean;
  roundStatus: string;
  onDeleted?: () => void;
}

export function DeleteRoundDialog({
  roundId,
  tournamentId,
  roundNumber,
  isSingleRound,
  isCommissioner,
  roundStatus,
  onDeleted,
}: DeleteRoundDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isCommissioner || roundStatus !== 'draft') {
    return null;
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isSingleRound) {
        await deleteTournamentFn({ data: { tournamentId } });
        toast.success('Round deleted.');
        navigate({ to: '/' });
      } else {
        await deleteRoundFn({ data: { roundId } });
        toast.success('Round deleted.');
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId },
        });
      }
      onDeleted?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete round',
      );
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete round?"
        description={`This will permanently delete Round ${roundNumber ?? '—'} and all its participants and scores. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
