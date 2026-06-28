import { useState } from 'react';
import { useCreateSideGame } from '@/lib/games';
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
  disabled?: boolean;
}) {
  const disabledProp = (arguments[0] as any).disabled as boolean | undefined;
  const [open, setOpen] = useState(false);
  const [createSideGame, { isPending }] = useCreateSideGame();
  const [format, setFormat] = useState<'nearest_pin' | 'longest_drive'>(
    'nearest_pin',
  );
  const [holeNumber, setHoleNumber] = useState(1);
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>(
    'standalone',
  );
  const [bonusPoints, setBonusPoints] = useState(1);

  const getFormatLabel = () => {
    const label =
      BONUS_FORMATS.find((f) => f.value === format)?.label ?? format;
    return `${label} - Hole ${holeNumber}`;
  };

  const resetForm = () => {
    setFormat('nearest_pin');
    setHoleNumber(1);
    setBonusMode('standalone');
    setBonusPoints(1);
  };

  const handleSave = async () => {
    await createSideGame({
      variables: {
        tournamentId,
        roundId,
        name: getFormatLabel(),
        format,
        holeNumber,
        bonusMode,
        bonusPoints,
      },
      onSuccess: () => {
        toast.success('Bonus prize created.');
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
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as 'nearest_pin' | 'longest_drive')
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
