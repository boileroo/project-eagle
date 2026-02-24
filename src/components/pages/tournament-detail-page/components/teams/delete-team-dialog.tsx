import { useState } from 'react';
import { deleteTeamFn } from '@/lib/teams.server';
import { deleteCompetitionFn } from '@/lib/competitions.server';
import { isTeamFormat } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type CompetitionData = {
  id: string;
  formatType: string;
  name: string;
};

type DeleteTeamDialogProps = {
  open: boolean;
  teamId: string;
  teamName: string;
  competitions: CompetitionData[];
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
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const teamGames = competitions.filter((c: CompetitionData) =>
        isTeamFormat(c.formatType as 'best_ball' | 'hi_lo' | 'rumble'),
      );

      for (const comp of teamGames) {
        try {
          await deleteCompetitionFn({ data: { competitionId: comp.id } });
        } catch (error) {
          console.error('Failed to delete game:', error);
        }
      }

      if (teamGames.length > 0) {
        toast.success(
          `Team deleted. ${teamGames.length} game${teamGames.length > 1 ? 's' : ''} removed.`,
        );
      } else {
        toast.success('Team deleted.');
      }

      await deleteTeamFn({ data: { teamId } });
      onDeleted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete team',
      );
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete team?</DialogTitle>
          <DialogDescription>
            This will delete <strong>{teamName}</strong> and remove all its
            member assignments. Players will remain in the round. Any team-based
            games involving this team will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
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
