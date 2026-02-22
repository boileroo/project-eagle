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
import { INDIVIDUAL_FORMATS } from './constants';

export function AddIndividualCompDialog({
  tournamentId,
  roundId,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  /** Kept for API compatibility but no longer used */
  hasTeams?: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('wolf');

  // Six Point scoring basis: stableford or gross
  const [sixPointScoringBasis, setSixPointScoringBasis] = useState<
    'stableford' | 'gross'
  >('stableford');

  const resetForm = () => {
    setName('');
    setFormatType('wolf');
    setSixPointScoringBasis('stableford');
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'wolf':
        return { formatType: 'wolf', config: {} };
      case 'six_point':
        return {
          formatType: 'six_point',
          config: { scoringBasis: sixPointScoringBasis },
        };
      case 'chair':
        return { formatType: 'chair', config: {} };
      default:
        return { formatType: 'wolf', config: {} };
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
          competitionCategory: 'game',
          groupScope: 'within_group',
          roundId,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Game created.');
      setOpen(false);
      resetForm();
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create game',
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
          + Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Game</DialogTitle>
          <DialogDescription>
            Create a within-group game (Wolf, Six Point, or Chair).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-name">Name</Label>
            <Input
              id="game-name"
              placeholder="e.g. Wolf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-format">Format</Label>
            <Select
              id="game-format"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {INDIVIDUAL_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
          </div>

          {formatType === 'wolf' && (
            <p className="text-muted-foreground text-xs">
              Wolf rotates by group position. Points: wolf+partner win = 2 each;
              lone wolf win = 4; lone wolf loss = 2 to each of the other 3.
            </p>
          )}

          {formatType === 'six_point' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                3-player game. Fixed distribution: 1st = 4 pts, 2nd = 2 pts, 3rd
                = 0 pts. Ties share points.
              </p>
              <div className="space-y-2">
                <Label>Scoring Basis</Label>
                <div className="flex gap-3">
                  {(
                    [
                      { value: 'stableford', label: 'Stableford' },
                      { value: 'gross', label: 'Gross Strokes' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-1.5 text-sm"
                    >
                      <input
                        type="radio"
                        name="six-point-basis"
                        value={opt.value}
                        checked={sixPointScoringBasis === opt.value}
                        onChange={() => setSixPointScoringBasis(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {formatType === 'chair' && (
            <p className="text-muted-foreground text-xs">
              Win a hole outright to take the chair. Tie = chair holder retains.
              1 point per hole the chair is held.
            </p>
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
