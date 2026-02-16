import { useState } from 'react';
import { updateCompetitionFn } from '@/lib/competitions.server';
import { FORMAT_TYPE_LABELS, isBonusFormat } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { CompetitionsData } from './types';

export function EditCompetitionDialog({
  comp,
  hasGroups,
  onSaved,
}: {
  comp: CompetitionsData[number];
  hasGroups: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatType = comp.formatType as CompetitionConfig['formatType'];
  const existingConfig = (comp.configJson ?? {}) as Record<string, unknown>;
  const isBonus = isBonusFormat(formatType);

  const [name, setName] = useState(comp.name);
  const [groupScope, setGroupScope] = useState<'all' | 'within_group'>(
    (comp.groupScope as 'all' | 'within_group') ?? 'all',
  );
  const [countBack, setCountBack] = useState<boolean>(
    (existingConfig.countBack as boolean) ?? true,
  );
  const [scoringBasis, setScoringBasis] = useState<
    'net_strokes' | 'gross_strokes'
  >((existingConfig.scoringBasis as 'net_strokes' | 'gross_strokes') ?? 'net_strokes');
  const [pointsPerWin, setPointsPerWin] = useState<number>(
    (existingConfig.pointsPerWin as number) ?? 1,
  );
  const [pointsPerHalf, setPointsPerHalf] = useState<number>(
    (existingConfig.pointsPerHalf as number) ?? 0.5,
  );
  const [holeNumber, setHoleNumber] = useState<number>(
    (existingConfig.holeNumber as number) ?? 1,
  );
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>(
    (existingConfig.bonusMode as 'standalone' | 'contributor') ?? 'standalone',
  );
  const [bonusPoints, setBonusPoints] = useState<number>(
    (existingConfig.bonusPoints as number) ?? 1,
  );

  const resetForm = () => {
    setName(comp.name);
    setGroupScope((comp.groupScope as 'all' | 'within_group') ?? 'all');
    setCountBack((existingConfig.countBack as boolean) ?? true);
    setScoringBasis((existingConfig.scoringBasis as 'net_strokes' | 'gross_strokes') ?? 'net_strokes');
    setPointsPerWin((existingConfig.pointsPerWin as number) ?? 1);
    setPointsPerHalf((existingConfig.pointsPerHalf as number) ?? 0.5);
    setHoleNumber((existingConfig.holeNumber as number) ?? 1);
    setBonusMode((existingConfig.bonusMode as 'standalone' | 'contributor') ?? 'standalone');
    setBonusPoints((existingConfig.bonusPoints as number) ?? 1);
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
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings: (existingConfig.pairings as { playerA: string; playerB: string }[]) ?? [],
          },
        };
      case 'best_ball':
        return {
          formatType: 'best_ball',
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings: (existingConfig.pairings as { teamA: string; teamB: string }[]) ?? [],
          },
        };
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
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Competition name is required.');
      return;
    }
    setSaving(true);
    try {
      await updateCompetitionFn({
        data: {
          id: comp.id,
          name: name.trim(),
          groupScope,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Competition updated.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update competition',
      );
    }
    setSaving(false);
  };

  const formatLabel = FORMAT_TYPE_LABELS[formatType] ?? formatType;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7">
          ✎
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Competition</DialogTitle>
          <DialogDescription>
            {formatLabel} ·{' '}
            {comp.participantType === 'team' ? 'Team' : 'Individual'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-comp-name">Name</Label>
            <Input
              id="edit-comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {hasGroups && !isBonus && (
            <div className="space-y-2">
              <Label>Scope</Label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={groupScope}
                onChange={(e) =>
                  setGroupScope(e.target.value as 'all' | 'within_group')
                }
              >
                <option value="all">All players</option>
                <option value="within_group">Within each group</option>
              </select>
            </div>
          )}

          {formatType === 'stableford' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-countback"
                checked={countBack}
                onChange={(e) => setCountBack(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-countback">Count-back tiebreaker</Label>
            </div>
          )}

          {formatType === 'stroke_play' && (
            <div className="space-y-2">
              <Label>Scoring Basis</Label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={scoringBasis}
                onChange={(e) =>
                  setScoringBasis(
                    e.target.value as 'net_strokes' | 'gross_strokes',
                  )
                }
              >
                <option value="net_strokes">Net Strokes</option>
                <option value="gross_strokes">Gross Strokes</option>
              </select>
            </div>
          )}

          {(formatType === 'match_play' || formatType === 'best_ball') && (
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
          )}

          {(formatType === 'nearest_pin' || formatType === 'longest_drive') && (
            <div className="space-y-3">
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
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={bonusMode}
                  onChange={(e) =>
                    setBonusMode(e.target.value as 'standalone' | 'contributor')
                  }
                >
                  <option value="standalone">Standalone (award only)</option>
                  <option value="contributor">
                    Contributor (adds to individual standings)
                  </option>
                </select>
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
                    Points added to the winner&apos;s individual tournament standing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
