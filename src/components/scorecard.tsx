import { cn } from '@/lib/utils';
import {
  resolveEffectiveHandicap,
  getPlayingHandicap,
  getStrokesOnHole,
} from '@/lib/handicaps';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type Hole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number | null;
};

type Participant = {
  id: string;
  handicapSnapshot: string;
  handicapOverride: string | null;
  person: { displayName: string };
  tournamentParticipant?: {
    handicapOverride: string | null;
  } | null;
};

type ScoreCell = {
  strokes: number;
  recordedByRole: string;
  eventCount: number;
};

type Scorecard = Record<string, Record<number, ScoreCell>>;

type ScorecardProps = {
  holes: Hole[];
  participants: Participant[];
  scores: Scorecard;
  roundStatus: string;
  isCommissioner: boolean;
  onScoreClick: (
    roundParticipantId: string,
    holeNumber: number,
    currentStrokes?: number,
  ) => void;
  onHistoryClick?: (
    roundParticipantId: string,
    holeNumber: number,
  ) => void;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Get initials or short name from display name */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 3);
  return parts.map((p) => p[0]).join('').toUpperCase();
}

/** Colour class for a score relative to par */
function scoreCellClass(strokes: number, par: number): string {
  const diff = strokes - par;
  if (diff <= -2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  if (diff === -1) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (diff === 0) return '';
  if (diff === 1) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function Scorecard({
  holes,
  participants,
  scores,
  roundStatus,
  isCommissioner,
  onScoreClick,
  onHistoryClick,
}: ScorecardProps) {
  const canEdit =
    roundStatus === 'open' || (roundStatus === 'locked' && isCommissioner);

  const frontNine = holes.filter((h) => h.holeNumber <= 9);
  const backNine = holes.filter((h) => h.holeNumber > 9);
  const hasBackNine = backNine.length > 0;

  // Compute playing handicaps
  const playingHCs = participants.map((p) => {
    const effective = resolveEffectiveHandicap(p);
    return getPlayingHandicap(effective);
  });

  // Get total par
  const frontPar = frontNine.reduce((s, h) => s + h.par, 0);
  const backPar = backNine.reduce((s, h) => s + h.par, 0);
  const totalPar = frontPar + backPar;

  // Compute totals per participant
  const getTotal = (participantId: string, holeList: Hole[]) => {
    const ps = scores[participantId];
    if (!ps) return null;
    let total = 0;
    let count = 0;
    for (const h of holeList) {
      const cell = ps[h.holeNumber];
      if (cell) {
        total += cell.strokes;
        count++;
      }
    }
    return count > 0 ? total : null;
  };

  const renderScoreCell = (
    participant: Participant,
    participantIdx: number,
    hole: Hole,
  ) => {
    const cell = scores[participant.id]?.[hole.holeNumber];
    const strokesReceived = getStrokesOnHole(
      playingHCs[participantIdx],
      hole.strokeIndex,
    );

    return (
      <td
        key={participant.id}
        className={cn(
          'relative h-10 min-w-12 border px-1 text-center text-sm',
          cell ? scoreCellClass(cell.strokes, hole.par) : '',
          canEdit && 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-inset',
        )}
        onClick={() => {
          if (canEdit) {
            onScoreClick(participant.id, hole.holeNumber, cell?.strokes);
          }
        }}
      >
        {cell ? (
          <span className="font-medium">{cell.strokes}</span>
        ) : (
          <span className="text-muted-foreground/40">–</span>
        )}
        {/* Stroke dots — show strokes received on this hole */}
        {strokesReceived > 0 && (
          <span className="absolute top-0.5 right-0.5 flex gap-px">
            {Array.from({ length: strokesReceived }).map((_, i) => (
              <span
                key={i}
                className="bg-foreground/30 inline-block h-1 w-1 rounded-full"
              />
            ))}
          </span>
        )}
        {/* Commissioner override indicator */}
        {cell?.recordedByRole === 'commissioner' && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] opacity-50">
            ⚙
          </span>
        )}
        {/* History indicator — multiple events */}
        {cell && cell.eventCount > 1 && onHistoryClick && (
          <button
            type="button"
            className="absolute top-0.5 left-0.5 text-[8px] text-muted-foreground opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onHistoryClick(participant.id, hole.holeNumber);
            }}
          >
            ✎
          </button>
        )}
      </td>
    );
  };

  const renderTotalCell = (
    participantId: string,
    holeList: Hole[],
    par: number,
  ) => {
    const total = getTotal(participantId, holeList);
    const diff = total != null ? total - par : null;
    return (
      <td key={participantId} className="border bg-muted/50 px-1 text-center text-sm font-semibold">
        {total != null ? (
          <span>
            {total}
            {diff != null && diff !== 0 && (
              <span className={cn('ml-1 text-xs', diff > 0 ? 'text-red-500' : 'text-green-600')}>
                {diff > 0 ? `+${diff}` : diff}
              </span>
            )}
          </span>
        ) : (
          '–'
        )}
      </td>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/30">
            <th className="sticky left-0 z-10 border bg-background px-2 py-1.5 text-left text-xs font-medium">
              Hole
            </th>
            <th className="border px-2 py-1.5 text-center text-xs font-medium">
              Par
            </th>
            <th className="border px-2 py-1.5 text-center text-xs font-medium">
              SI
            </th>
            {participants.map((p, i) => (
              <th
                key={p.id}
                className="border px-2 py-1.5 text-center text-xs font-medium"
                title={`${p.person.displayName} (HC ${playingHCs[i]})`}
              >
                {shortName(p.person.displayName)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Front 9 */}
          {frontNine.map((hole) => (
            <tr key={hole.holeNumber}>
              <td className="sticky left-0 z-10 border bg-background px-2 py-1 text-center text-xs font-medium">
                {hole.holeNumber}
              </td>
              <td className="border px-2 py-1 text-center text-xs text-muted-foreground">
                {hole.par}
              </td>
              <td className="border px-2 py-1 text-center text-xs text-muted-foreground">
                {hole.strokeIndex}
              </td>
              {participants.map((p, i) => renderScoreCell(p, i, hole))}
            </tr>
          ))}

          {/* Out row */}
          <tr className="bg-muted/30 font-semibold">
            <td className="sticky left-0 z-10 border bg-muted/30 px-2 py-1 text-center text-xs">
              Out
            </td>
            <td className="border px-2 py-1 text-center text-xs">{frontPar}</td>
            <td className="border px-2 py-1 text-center text-xs" />
            {participants.map((p) => renderTotalCell(p.id, frontNine, frontPar))}
          </tr>

          {/* Back 9 */}
          {hasBackNine && (
            <>
              {backNine.map((hole) => (
                <tr key={hole.holeNumber}>
                  <td className="sticky left-0 z-10 border bg-background px-2 py-1 text-center text-xs font-medium">
                    {hole.holeNumber}
                  </td>
                  <td className="border px-2 py-1 text-center text-xs text-muted-foreground">
                    {hole.par}
                  </td>
                  <td className="border px-2 py-1 text-center text-xs text-muted-foreground">
                    {hole.strokeIndex}
                  </td>
                  {participants.map((p, i) => renderScoreCell(p, i, hole))}
                </tr>
              ))}

              {/* In row */}
              <tr className="bg-muted/30 font-semibold">
                <td className="sticky left-0 z-10 border bg-muted/30 px-2 py-1 text-center text-xs">
                  In
                </td>
                <td className="border px-2 py-1 text-center text-xs">
                  {backPar}
                </td>
                <td className="border px-2 py-1 text-center text-xs" />
                {participants.map((p) =>
                  renderTotalCell(p.id, backNine, backPar),
                )}
              </tr>
            </>
          )}

          {/* Total row */}
          <tr className="bg-muted/50 font-bold">
            <td className="sticky left-0 z-10 border bg-muted/50 px-2 py-1.5 text-center text-xs">
              Total
            </td>
            <td className="border px-2 py-1.5 text-center text-xs">
              {totalPar}
            </td>
            <td className="border px-2 py-1.5 text-center text-xs" />
            {participants.map((p) => renderTotalCell(p.id, holes, totalPar))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
