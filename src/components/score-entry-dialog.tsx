import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks';
import type { ScorecardData } from '@/components/round-detail/types';
import type { SubmitScoreInput } from '@/lib/validators';

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
}: ScoreEntryDialogProps) {
  const [strokes, setStrokes] = useState<number | null>(currentStrokes ?? null);
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const scorecardQueryKey = ['round', roundId, 'scorecard'] as const;
  const scoreMutation = useMutation({
    mutationKey: ['submit-score'],
    onMutate: async (
      variables: SubmitScoreInput & { clientMeta?: { savedOffline?: boolean } },
    ) => {
      const savedOffline = typeof window === 'undefined' ? false : !isOnline;
      await queryClient.cancelQueries({ queryKey: scorecardQueryKey });
      const previousScorecard =
        queryClient.getQueryData<ScorecardData>(scorecardQueryKey);

      const nextScorecard: ScorecardData = previousScorecard
        ? structuredClone(previousScorecard)
        : {};
      const participantScores = {
        ...nextScorecard[variables.roundParticipantId],
      };
      const existing = participantScores[variables.holeNumber];
      participantScores[variables.holeNumber] = {
        strokes: variables.strokes,
        recordedByRole: variables.recordedByRole,
        eventCount: (existing?.eventCount ?? 0) + 1,
      };
      nextScorecard[variables.roundParticipantId] = participantScores;

      queryClient.setQueryData(scorecardQueryKey, nextScorecard);

      if (savedOffline) {
        toast.info(
          `Hole ${variables.holeNumber}: ${variables.strokes} stroke${variables.strokes !== 1 ? 's' : ''} saved offline.`,
        );
      }

      return {
        previousScorecard: savedOffline ? undefined : previousScorecard,
        savedOffline,
      };
    },
    onError: (error, variables, context) => {
      if (context?.previousScorecard) {
        queryClient.setQueryData(scorecardQueryKey, context.previousScorecard);
      } else {
        void queryClient.invalidateQueries({ queryKey: scorecardQueryKey });
      }
      const rawMessage = error instanceof Error ? error.message : '';
      const normalizedMessage = rawMessage.toLowerCase();
      const message = rawMessage
        ? normalizedMessage.includes('round must be open')
          ? 'Round is closed.'
          : normalizedMessage.includes('round not found')
            ? 'Round no longer exists.'
            : normalizedMessage.includes('participant not in this round')
              ? 'Player is no longer in this round.'
              : normalizedMessage.includes('failed to fetch')
                ? 'Network error. Check your connection.'
                : rawMessage
        : 'Failed to save score.';
      const wasSavedOffline = variables?.clientMeta?.savedOffline ?? false;
      const prefix = wasSavedOffline
        ? 'Offline score could not be synced.'
        : 'Score could not be saved.';
      const holeLabel = variables?.holeNumber ?? holeNumber;
      toast.error(
        `${participantName} · Hole ${holeLabel}: ${prefix} ${message}`,
      );
    },
  });

  // Sync strokes state when the target hole/participant changes
  const targetKey = `${roundParticipantId}:${holeNumber}`;
  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setStrokes(currentStrokes ?? null);
  }

  const handleSave = async () => {
    if (strokes == null) return;
    const variables: SubmitScoreInput & {
      clientMeta?: { savedOffline?: boolean };
    } = {
      roundId,
      roundParticipantId,
      holeNumber,
      strokes,
      recordedByRole,
      clientMeta: { savedOffline: !isOnline },
    };
    scoreMutation.mutate(variables);
    onOpenChange(false);
  };

  const disableSave =
    strokes == null || (scoreMutation.isPending && !scoreMutation.isPaused);

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

        {/* Score display */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 text-xl"
              onClick={() => setStrokes((s) => Math.max(1, (s ?? par) - 1))}
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
              onClick={() => setStrokes((s) => Math.min(20, (s ?? par) + 1))}
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
            Recording as {recordedByRole}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={disableSave}>
            {scoreMutation.isPending && !scoreMutation.isPaused
              ? 'Saving…'
              : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
