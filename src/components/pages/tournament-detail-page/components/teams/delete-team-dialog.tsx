import { useDeleteTeam } from '@/lib/teams';
import { isTeamFormat, useDeleteGame } from '@/lib/games';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { toast } from 'sonner';
import { type GameData } from '@/types';

type DeleteTeamDialogProps = {
  open: boolean;
  teamId: string;
  teamName: string;
  competitions: GameData[];
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteTeamDialog({
  open,
  teamId,
  teamName,
  competitions,
  onClose,
  onDeleted,
}: DeleteTeamDialogProps) {
  const { loading, handleConfirm } = useConfirmDialog();
  const [deleteGame] = useDeleteGame();
  const [deleteTeam] = useDeleteTeam();

  const handleDelete = () =>
    handleConfirm(async () => {
      const teamGames = competitions.filter((c: GameData) =>
        isTeamFormat(c.format as 'best_ball' | 'hi_lo' | 'rumble'),
      );

      for (const comp of teamGames) {
        await deleteGame({
          variables: { gameId: comp.id },
          onError: (error) => {
            console.error('Failed to delete game:', error);
          },
        });
      }

      await deleteTeam({ variables: { teamId } });

      if (teamGames.length > 0) {
        toast.success(
          `Team deleted. ${teamGames.length} game${teamGames.length > 1 ? 's' : ''} removed.`,
        );
      } else {
        toast.success('Team deleted.');
      }

      onDeleted();
    });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Delete team?"
      description={
        <>
          This will delete <strong>{teamName}</strong> and remove all its member
          assignments. Players will remain in the round. Any team-based games
          involving this team will also be deleted.
        </>
      }
      confirmText="Delete"
      variant="destructive"
      loading={loading}
      onConfirm={handleDelete}
    />
  );
}
