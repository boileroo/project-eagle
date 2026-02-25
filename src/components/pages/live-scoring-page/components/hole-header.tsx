// ──────────────────────────────────────────────
// HoleHeader — displays hole metadata at the top of the live scoring view
// ──────────────────────────────────────────────

type HoleHeaderProps = {
  holeNumber: number;
  totalHoles: number;
  par: number;
  strokeIndex: number;
  yardage: number | null;
};

export function HoleHeader({
  holeNumber,
  totalHoles,
  par,
  strokeIndex,
  yardage,
}: HoleHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        Hole {holeNumber} of {totalHoles}
      </p>
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums">{holeNumber}</span>
      </div>
      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span>Par {par}</span>
        <span>·</span>
        <span>SI {strokeIndex}</span>
        {yardage != null && (
          <>
            <span>·</span>
            <span>{yardage}y</span>
          </>
        )}
      </div>
    </div>
  );
}
