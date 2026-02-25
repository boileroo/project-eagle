// ──────────────────────────────────────────────
// PlayerScoreCard — score entry for one player on the current hole.
// Auto-saves on every +/− or quick-select tap.
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { parLabel, scoreDiffColorClass } from '@/lib/scoring-utils';
import { useScoreMutation } from '@/hooks';
import { useOnlineStatus } from '@/hooks';

type PlayerScoreCardProps = {
  roundId: string;
  roundParticipantId: string;
  displayName: string;
  holeNumber: number;
  par: number;
  strokesReceived: number;
  strokes: number | undefined;
  recordedByRole: 'player' | 'marker' | 'commissioner';
  isEditable: boolean;
};

export function PlayerScoreCard({
  roundId,
  roundParticipantId,
  displayName,
  holeNumber,
  par,
  strokesReceived,
  strokes,
  recordedByRole,
  isEditable,
}: PlayerScoreCardProps) {
  const scoreMutation = useScoreMutation(roundId);
  const isOnline = useOnlineStatus();

  const submit = (s: number) => {
    if (!isEditable) return;
    scoreMutation.mutate({
      roundId,
      roundParticipantId,
      holeNumber,
      strokes: s,
      recordedByRole,
      clientMeta: { savedOffline: !isOnline },
    });
  };

  const currentVal = strokes;
  const base = currentVal ?? par;
  const diff = currentVal != null ? currentVal - par : null;

  // Quick-select grid: 1 through max(7, par+4)
  const gridMax = Math.max(7, par + 4);
  const quickOptions = Array.from({ length: gridMax }, (_, i) => i + 1);

  return (
    <div className="rounded-lg border p-4">
      {/* Player header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium">{displayName}</span>
        <div className="flex items-center gap-2">
          {strokesReceived > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{strokesReceived} hdcp
            </Badge>
          )}
          {recordedByRole !== 'player' && isEditable && (
            <Badge variant="outline" className="text-xs capitalize">
              {recordedByRole}
            </Badge>
          )}
        </div>
      </div>

      {/* +/− stepper + score display */}
      <div className="mb-3 flex items-center justify-center gap-4">
        <button
          type="button"
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border text-2xl font-light transition-colors',
            isEditable
              ? 'hover:bg-accent active:bg-accent/80'
              : 'cursor-not-allowed opacity-40',
          )}
          onClick={() => submit(Math.max(1, base - 1))}
          disabled={!isEditable || (currentVal != null && currentVal <= 1)}
          aria-label="Decrease strokes"
        >
          −
        </button>

        <div className="flex min-w-20 flex-col items-center">
          <span className="text-4xl font-bold tabular-nums">
            {currentVal ?? '–'}
          </span>
          {diff != null && (
            <span
              className={cn('text-sm font-medium', scoreDiffColorClass(diff))}
            >
              {parLabel(diff)}
            </span>
          )}
        </div>

        <button
          type="button"
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border text-2xl font-light transition-colors',
            isEditable
              ? 'hover:bg-accent active:bg-accent/80'
              : 'cursor-not-allowed opacity-40',
          )}
          onClick={() => submit(Math.min(20, base + 1))}
          disabled={!isEditable}
          aria-label="Increase strokes"
        >
          +
        </button>
      </div>

      {/* Quick-select grid */}
      {isEditable && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {quickOptions.map((n) => (
            <button
              key={n}
              type="button"
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                currentVal === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-accent',
              )}
              onClick={() => submit(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {!isEditable && (
        <p className="text-muted-foreground mt-1 text-center text-xs">
          View only
        </p>
      )}
    </div>
  );
}
