import { useState } from 'react';
import { useDeleteAllTeams } from '@/lib/teams';
import { isGameFormat, useDeleteCompetition } from '@/lib/competitions';
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
import { type CompetitionData } from '@/types';

type DisableTeamsDialogProps = {
  open: boolean;
  tournamentId: string;
  teamsCount: number;
  competitions: CompetitionData[];
  onClose: () => void;
  onDisabled: () => void;
};

export function DisableTeamsDialog({
  open,
  tournamentId,
  teamsCount,
  competitions,
  onClose,
  onDisabled,
}: DisableTeamsDialogProps) {
  const [disabling, setDisabling] = useState(false);
  const [deleteCompetition] = useDeleteCompetition();
  const [deleteAllTeams] = useDeleteAllTeams();

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const gamesToDelete = competitions.filter((c: CompetitionData) =>
        isGameFormat(
          c.formatType as
            | 'match_play'
            | 'best_ball'
            | 'hi_lo'
            | 'rumble'
            | 'wolf'
            | 'six_point'
            | 'chair',
        ),
      );

      for (const comp of gamesToDelete) {
        await deleteCompetition({
          variables: { competitionId: comp.id },
          onError: (error) => {
            console.error('Failed to delete game:', error);
          },
        });
      }

      await deleteAllTeams({ variables: { tournamentId } });

      toast.success('Teams disabled and all games removed.');
      onDisabled();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to disable teams',
      );
    }
    setDisabling(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable teams?</DialogTitle>
          <DialogDescription>
            This will delete all {teamsCount} team
            {teamsCount !== 1 ? 's' : ''} and remove all player assignments. All
            games (Best Ball, Hi-Lo, Rumble, etc.) will also be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={disabling}
            onClick={handleDisable}
          >
            {disabling ? 'Disabling...' : 'Disable Teams'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
