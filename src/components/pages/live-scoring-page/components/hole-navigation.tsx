// ──────────────────────────────────────────────
// HoleNavigation — prev/next controls and hole progress dots
// Fixed to the bottom of the scoring view
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type HoleNavigationProps = {
  currentHole: number;
  totalHoles: number;
  onPrev: () => void;
  onNext: () => void;
  /** Holes that have at least one score recorded for the current group */
  scoredHoles: Set<number>;
};

export function HoleNavigation({
  currentHole,
  totalHoles,
  onPrev,
  onNext,
  scoredHoles,
}: HoleNavigationProps) {
  const holes = Array.from({ length: totalHoles }, (_, i) => i + 1);

  return (
    <div className="bg-background border-t py-2">
      {/* Hole dots */}
      <div className="mb-2 flex items-center justify-center gap-1 overflow-x-auto px-2">
        {holes.map((n) => {
          const isCurrent = n === currentHole;
          const isScored = scoredHoles.has(n);
          return (
            <div
              key={n}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isScored
                    ? 'bg-success/20 text-success border-success/40 border'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {n}
            </div>
          );
        })}
      </div>

      {/* Prev / Next buttons */}
      <div className="flex items-center justify-between gap-2 px-4">
        <Button
          variant="outline"
          className="h-12 flex-1"
          onClick={onPrev}
          disabled={currentHole <= 1}
        >
          ← Prev
        </Button>
        <Button
          variant="outline"
          className="h-12 flex-1"
          onClick={onNext}
          disabled={currentHole >= totalHoles}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
