// ──────────────────────────────────────────────
// RunningTotals — compact scoreboard showing each player's
// cumulative strokes and +/− vs par through the current round
// ──────────────────────────────────────────────

import { cn } from '@/lib/utils';
import { scoreDiffColorClass } from '@/lib/scoring-utils';
import type { ScorecardData } from '@/components/round-detail/types';

type Hole = { holeNumber: number; par: number };

type Participant = {
  id: string;
  displayName: string;
};

type RunningTotalsProps = {
  participants: Participant[];
  scores: ScorecardData;
  holes: Hole[];
};

export function RunningTotals({
  participants,
  scores,
  holes,
}: RunningTotalsProps) {
  // Build totals for each participant (across all scored holes)
  const totals = participants.map((p) => {
    const participantScores = scores[p.id] ?? {};
    let totalStrokes = 0;
    let totalPar = 0;
    let holesPlayed = 0;

    for (const hole of holes) {
      const cell = participantScores[hole.holeNumber];
      if (cell != null) {
        totalStrokes += cell.strokes;
        totalPar += hole.par;
        holesPlayed++;
      }
    }

    const diff = holesPlayed > 0 ? totalStrokes - totalPar : null;
    return {
      id: p.id,
      displayName: p.displayName,
      totalStrokes,
      diff,
      holesPlayed,
    };
  });

  if (totals.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <p className="text-muted-foreground border-b px-3 py-2 text-xs font-medium tracking-wider uppercase">
        Running Totals
      </p>
      <div className="divide-y">
        {totals.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between px-3 py-2"
          >
            <span className="text-sm font-medium">{t.displayName}</span>
            <div className="flex items-center gap-3">
              {t.holesPlayed > 0 ? (
                <>
                  <span className="text-sm font-semibold tabular-nums">
                    {t.totalStrokes}
                  </span>
                  {t.diff != null && (
                    <span
                      className={cn(
                        'min-w-[2.5rem] text-right text-sm font-medium tabular-nums',
                        scoreDiffColorClass(t.diff),
                      )}
                    >
                      {t.diff === 0
                        ? 'E'
                        : t.diff > 0
                          ? `+${t.diff}`
                          : `${t.diff}`}
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    Thru {t.holesPlayed}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
