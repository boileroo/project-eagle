import { useState } from 'react';
import { useCreateCompetition } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import { BONUS_FORMATS } from '../constants';
import { BonusModeFields } from './competition-fields/bonus-mode-fields';

export function AddBonusCompDialog({
  tournamentId,
  roundId,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [createCompetition, { isPending }] = useCreateCompetition();
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('nearest_pin');
  const [holeNumber, setHoleNumber] = useState(1);
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>(
    'standalone',
  );
  const [bonusPoints, setBonusPoints] = useState(1);

  const getFormatLabel = () => {
    const label =
      BONUS_FORMATS.find((f) => f.value === formatType)?.label ?? formatType;
    return `${label} - Hole ${holeNumber}`;
  };

  const resetForm = () => {
    setFormatType('nearest_pin');
    setHoleNumber(1);
    setBonusMode('standalone');
    setBonusPoints(1);
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'nearest_pin':
        return {
          formatType: 'nearest_pin',
          config: { holeNumber, bonusMode, bonusPoints },
        };
      case 'longest_drive':
        return {
          formatType: 'longest_drive',
          config: { holeNumber, bonusMode, bonusPoints },
        };
      default:
        return {
          formatType: 'nearest_pin',
          config: { holeNumber, bonusMode, bonusPoints },
        };
    }
  };

  const handleSave = async () => {
    await createCompetition({
      variables: {
        tournamentId,
        name: getFormatLabel(),
        competitionCategory: 'bonus',
        groupScope: 'all',
        roundId,
        competitionConfig: buildConfig(),
      },
      onSuccess: () => {
        toast.success('Bonus competition created.');
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
        <Button variant="outline" size="sm">
          + Bonus
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bonus Prize</DialogTitle>
          <DialogDescription>
            Add a nearest-the-pin or longest-drive prize.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonus-comp-format">Type</Label>
            <Select
              id="bonus-comp-format"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
              autoFocus
            >
              {BONUS_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            <BonusModeFields
              holeNumber={holeNumber}
              bonusMode={bonusMode}
              bonusPoints={bonusPoints}
              onHoleNumberChange={setHoleNumber}
              onBonusModeChange={setBonusMode}
              onBonusPointsChange={setBonusPoints}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
