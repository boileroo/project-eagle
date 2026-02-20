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
  hasTeams,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  hasTeams: boolean;
  onSaved: () => void;
}) {
  const availableFormats = hasTeams
    ? INDIVIDUAL_FORMATS.filter((f) => f.value !== 'match_play')
    : INDIVIDUAL_FORMATS;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('stableford');

  const [countBack, setCountBack] = useState(true);
  const [scoringBasis, setScoringBasis] = useState<
    'net_strokes' | 'gross_strokes'
  >('net_strokes');
  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const resetForm = () => {
    setName('');
    setFormatType('stableford');
    setCountBack(true);
    setScoringBasis('net_strokes');
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'stableford':
        return { formatType: 'stableford', config: { countBack } };
      case 'stroke_play':
        return { formatType: 'stroke_play', config: { scoringBasis } };
      case 'match_play':
        return {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
      default:
        return { formatType: 'stableford', config: { countBack } };
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
      toast.success('Competition created.');
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
          + Individual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Individual Competition</DialogTitle>
          <DialogDescription>
            Create a competition scored per player.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="indiv-comp-name">Name</Label>
            <Input
              id="indiv-comp-name"
              placeholder="e.g. Day 1 Stableford"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indiv-comp-format">Format</Label>
            <Select
              id="indiv-comp-format"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {availableFormats.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
          </div>

          {formatType === 'stableford' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="indiv-countback"
                checked={countBack}
                onChange={(e) => setCountBack(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="indiv-countback">Count-back tiebreaker</Label>
            </div>
          )}

          {formatType === 'stroke_play' && (
            <div className="space-y-2">
              <Label>Scoring Basis</Label>
              <Select
                value={scoringBasis}
                onChange={(e) =>
                  setScoringBasis(
                    e.target.value as 'net_strokes' | 'gross_strokes',
                  )
                }
              >
                <option value="net_strokes">Net Strokes</option>
                <option value="gross_strokes">Gross Strokes</option>
              </Select>
            </div>
          )}

          {formatType === 'match_play' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Points per Win</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerWin}
                    onChange={(e) =>
                      setPointsPerWin(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points per Half</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerHalf}
                    onChange={(e) =>
                      setPointsPerHalf(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Pairings can be configured after creation.
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
