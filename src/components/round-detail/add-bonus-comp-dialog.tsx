import { useState } from 'react';
import { createCompetitionFn } from '@/lib/competitions.server';
import type { CompetitionConfig } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { BONUS_FORMATS } from './constants';

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
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('nearest_pin');
  const [holeNumber, setHoleNumber] = useState(1);
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>(
    'standalone',
  );
  const [bonusPoints, setBonusPoints] = useState(1);

  const resetForm = () => {
    setName('');
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
    if (!name.trim()) {
      toast.error('Competition name is required.');
      return;
    }
    setSaving(true);
    try {
      await createCompetitionFn({
        data: {
          tournamentId,
          name: name.trim(),
          participantType: 'individual',
          groupScope: 'all',
          roundId,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Bonus competition created.');
      setOpen(false);
      resetForm();
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create competition',
      );
    }
    setSaving(false);
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
            <Label htmlFor="bonus-comp-name">Name</Label>
            <Input
              id="bonus-comp-name"
              placeholder="e.g. NTP Hole 7"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonus-comp-format">Type</Label>
            <Select
              id="bonus-comp-format"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {BONUS_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hole Number</Label>
            <Input
              type="number"
              min={1}
              max={18}
              value={holeNumber}
              onChange={(e) => setHoleNumber(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bonus Mode</Label>
            <Select
              value={bonusMode}
              onChange={(e) =>
                setBonusMode(e.target.value as 'standalone' | 'contributor')
              }
            >
              <option value="standalone">Standalone (award only)</option>
              <option value="contributor">
                Contributor (adds to individual standings)
              </option>
            </Select>
          </div>

          {bonusMode === 'contributor' && (
            <div className="space-y-2">
              <Label>Bonus Points</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={bonusPoints}
                onChange={(e) =>
                  setBonusPoints(parseFloat(e.target.value) || 1)
                }
              />
              <p className="text-muted-foreground text-xs">
                Points added to the winner&apos;s individual tournament
                standing.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
