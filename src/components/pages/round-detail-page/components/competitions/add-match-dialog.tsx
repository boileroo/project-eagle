import { useState } from 'react';
import { useCreateCompetition } from '@/lib/competitions';
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
import type { RoundCompetitionsData } from '../types';
import { PointsFields } from './competition-fields/points-fields';

export function AddMatchDialog({
  tournamentId,
  roundId,
  competitions,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  competitions: RoundCompetitionsData;
  onSaved: () => void;
  disabled?: boolean;
}) {
  const disabledProp = (arguments[0] as any).disabled as boolean | undefined;
  const [open, setOpen] = useState(false);
  const [createCompetition, { isPending: saving }] = useCreateCompetition();
  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const hasMatchPlayComp = competitions.some(
    (c) => c.formatType === 'match_play',
  );

  const resetForm = () => {
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
  };

  const handleSave = async () => {
    await createCompetition({
      variables: {
        tournamentId,
        name: 'Singles',
        competitionCategory: 'match',
        groupScope: 'all',
        roundId,
        competitionConfig: {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        },
      },
      onSuccess: () => {
        toast.success('Competition created.');
        setOpen(false);
        resetForm();
        onSaved();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabledProp}>
          + Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Match</DialogTitle>
          <DialogDescription>
            Create a singles match play competition.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {hasMatchPlayComp && (
            <p className="text-destructive text-xs">
              A Singles competition already exists for this round. Only one is
              allowed.
            </p>
          )}
          <PointsFields
            pointsPerWin={pointsPerWin}
            pointsPerHalf={pointsPerHalf}
            onPointsPerWinChange={setPointsPerWin}
            onPointsPerHalfChange={setPointsPerHalf}
          />
          <p className="text-muted-foreground text-xs">
            Pairings are configured using Configure Matches after creation.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || hasMatchPlayComp}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
