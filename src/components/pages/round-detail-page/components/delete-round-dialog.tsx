import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useDeleteRound } from '@/lib/rounds';
import { useDeleteTournament } from '@/lib/tournaments';
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
  const [deleteRound, { isPending: deletingRound }] = useDeleteRound();
  const [deleteTournament, { isPending: deletingTournament }] =
    useDeleteTournament();
  const deleting = deletingRound || deletingTournament;

  if (!isCommissioner || roundStatus !== 'draft') {
    return null;
  }

  const handleDelete = async () => {
    if (isSingleRound) {
      await deleteTournament({
        variables: { tournamentId },
        onSuccess: () => {
          toast.success('Round deleted.');
          navigate({ to: '/' });
          onDeleted?.();
        },
        onError: (error) => {
          toast.error(error.message);
          setOpen(false);
        },
      });
    } else {
      await deleteRound({
        variables: { roundId },
        onSuccess: () => {
          toast.success('Round deleted.');
          navigate({
            to: '/tournaments/$tournamentId',
            params: { tournamentId },
          });
          onDeleted?.();
        },
        onError: (error) => {
          toast.error(error.message);
          setOpen(false);
        },
      });
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
