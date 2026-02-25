import { useState } from 'react';
import { updateCompetitionFn } from '@/lib/competitions.server';
import { FORMAT_TYPE_LABELS, isBonusFormat } from '@/lib/competitions';
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
import type { RoundCompetitionsData } from '../types';
import { PointsFields } from './competition-fields/points-fields';
import { BonusModeFields } from './competition-fields/bonus-mode-fields';
import { ScoringBasisRadio } from './competition-fields/scoring-basis-radio';

export function EditCompetitionDialog({
  comp,
  hasGroups,
  onSaved,
}: {
  comp: RoundCompetitionsData[number];
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
  const [scoringBasis, setScoringBasis] = useState<
    'net_strokes' | 'gross_strokes'
  >(
    (existingConfig.scoringBasis as 'net_strokes' | 'gross_strokes') ??
      'net_strokes',
  );
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
  const [sixPointScoringBasis, setSixPointScoringBasis] = useState<
    'stableford' | 'gross'
  >((existingConfig.scoringBasis as 'stableford' | 'gross') ?? 'stableford');

  const resetForm = () => {
    setName(comp.name);
    setGroupScope((comp.groupScope as 'all' | 'within_group') ?? 'all');
    setScoringBasis(
      (existingConfig.scoringBasis as 'net_strokes' | 'gross_strokes') ??
        'net_strokes',
    );
    setPointsPerWin((existingConfig.pointsPerWin as number) ?? 1);
    setPointsPerHalf((existingConfig.pointsPerHalf as number) ?? 0.5);
    setHoleNumber((existingConfig.holeNumber as number) ?? 1);
    setBonusMode(
      (existingConfig.bonusMode as 'standalone' | 'contributor') ??
        'standalone',
    );
    setBonusPoints((existingConfig.bonusPoints as number) ?? 1);
    setSixPointScoringBasis(
      (existingConfig.scoringBasis as 'stableford' | 'gross') ?? 'stableford',
    );
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'stableford':
        return { formatType: 'stableford', config: {} };
      case 'stroke_play':
        return { formatType: 'stroke_play', config: { scoringBasis } };
      case 'match_play':
        return {
          formatType: 'match_play',
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings:
              (existingConfig.pairings as {
                playerA: string;
                playerB: string;
              }[]) ?? [],
          },
        };
      case 'best_ball':
        return {
          formatType: 'best_ball',
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings:
              (existingConfig.pairings as { teamA: string; teamB: string }[]) ??
              [],
          },
        };
      case 'hi_lo':
        return {
          formatType: 'hi_lo',
          config: { pointsPerWin, pointsPerHalf },
        };
      case 'rumble':
        return {
          formatType: 'rumble',
          config: { pointsPerWin },
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
      default:
        // wolf, chair: name-only edit (no config fields needed)
        if (formatType === 'wolf') return { formatType: 'wolf', config: {} };
        if (formatType === 'chair') return { formatType: 'chair', config: {} };
        if (formatType === 'six_point')
          return {
            formatType: 'six_point',
            config: { scoringBasis: sixPointScoringBasis },
          };
        throw new Error(`Unsupported format type for edit: ${formatType}`);
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
            {comp.competitionCategory === 'match'
              ? 'Match'
              : comp.competitionCategory === 'game'
                ? 'Game'
                : 'Bonus'}
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

          {hasGroups &&
            !isBonus &&
            formatType !== 'wolf' &&
            formatType !== 'six_point' &&
            formatType !== 'chair' &&
            formatType !== 'hi_lo' &&
            formatType !== 'rumble' && (
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={groupScope}
                  onChange={(e) =>
                    setGroupScope(e.target.value as 'all' | 'within_group')
                  }
                >
                  <option value="all">All players</option>
                  <option value="within_group">Within each group</option>
                </Select>
              </div>
            )}

          {formatType === 'six_point' && (
            <div className="space-y-2">
              <ScoringBasisRadio
                value={sixPointScoringBasis}
                onChange={setSixPointScoringBasis}
                name="edit-six-point-basis"
              />
              <p className="text-muted-foreground text-xs">
                Fixed distribution: 1st = 4 pts, 2nd = 2 pts, 3rd = 0 pts.
              </p>
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

          {(formatType === 'match_play' || formatType === 'best_ball') && (
            <PointsFields
              pointsPerWin={pointsPerWin}
              pointsPerHalf={pointsPerHalf}
              onPointsPerWinChange={setPointsPerWin}
              onPointsPerHalfChange={setPointsPerHalf}
            />
          )}

          {formatType === 'hi_lo' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                2v2 per group. Each hole: High ball match + Low ball match — 2
                points available per hole.
              </p>
              <PointsFields
                pointsPerWin={pointsPerWin}
                pointsPerHalf={pointsPerHalf}
                onPointsPerWinChange={setPointsPerWin}
                onPointsPerHalfChange={setPointsPerHalf}
              />
            </div>
          )}

          {formatType === 'rumble' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                4-player groups (same team). Holes 1–6: best 1; Holes 7–12: top
                2; Holes 13–17: top 3; Hole 18: all 4. Higher team total wins.
              </p>
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
            </div>
          )}

          {(formatType === 'nearest_pin' || formatType === 'longest_drive') && (
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
