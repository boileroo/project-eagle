import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { submitScoreFn } from '@/lib/scores.server';
import { toast } from 'sonner';

type ScoreEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  roundParticipantId: string;
  participantName: string;
  holeNumber: number;
  par: number;
  currentStrokes?: number;
  recordedByRole: 'player' | 'marker' | 'commissioner';
  isCommissioner: boolean;
  roundStatus: string;
  onSaved: () => void;
};

export function ScoreEntryDialog({
  open,
  onOpenChange,
  roundId,
  roundParticipantId,
  participantName,
  holeNumber,
  par,
  currentStrokes,
  recordedByRole,
  isCommissioner,
  roundStatus,
  onSaved,
}: ScoreEntryDialogProps) {
  const [strokes, setStrokes] = useState<number | null>(
    currentStrokes ?? null,
  );
  const [saving, setSaving] = useState(false);

  // Sync strokes state when the target hole/participant changes
  const targetKey = `${roundParticipantId}:${holeNumber}`;
  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setStrokes(currentStrokes ?? null);
  }

  // Determine the effective role — commissioner override for locked rounds
  const effectiveRole =
    roundStatus === 'locked' && isCommissioner ? 'commissioner' : recordedByRole;

  const handleSave = async () => {
    if (strokes == null) return;
    setSaving(true);
    try {
      await submitScoreFn({
        data: {
          roundId,
          roundParticipantId,
          holeNumber,
          strokes,
          recordedByRole: effectiveRole,
        },
      });
      toast.success(
        `Hole ${holeNumber}: ${strokes} stroke${strokes !== 1 ? 's' : ''} saved.`,
      );
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save score',
      );
    }
    setSaving(false);
  };

  // Reset state when dialog opens
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setStrokes(currentStrokes ?? null);
    }
    onOpenChange(next);
  };

  const diff = strokes != null ? strokes - par : null;
  const diffLabel =
    diff != null
      ? diff === 0
        ? 'Par'
        : diff > 0
          ? `+${diff}`
          : `${diff}`
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>
            Hole {holeNumber} · Par {par}
          </DialogTitle>
          <DialogDescription>{participantName}</DialogDescription>
        </DialogHeader>

        {effectiveRole === 'commissioner' && roundStatus === 'locked' && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Commissioner override — this round is locked
          </div>
        )}

        {/* Score display */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl"
              onClick={() =>
                setStrokes((s) => Math.max(1, (s ?? par) - 1))
              }
              disabled={strokes != null && strokes <= 1}
            >
              −
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold tabular-nums">
                {strokes ?? '–'}
              </span>
              {diffLabel && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    diff! > 0
                      ? 'text-red-500'
                      : diff! < 0
                        ? 'text-green-600'
                        : 'text-muted-foreground',
                  )}
                >
                  {diffLabel}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl"
              onClick={() =>
                setStrokes((s) => Math.min(20, (s ?? par) + 1))
              }
            >
              +
            </Button>
          </div>

          {/* Quick-select grid for common scores */}
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: Math.max(7, par + 4) }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  type="button"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                    strokes === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent',
                  )}
                  onClick={() => setStrokes(n)}
                >
                  {n}
                </button>
              ),
            )}
          </div>

          {/* Role badge */}
          <Badge variant="outline" className="text-xs">
            Recording as {effectiveRole}
          </Badge>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStrokes != null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStrokes(currentStrokes)}
            >
              Reset
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || strokes == null}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
