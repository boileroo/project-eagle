import { cn } from '@/lib/utils';
import {
  resolveEffectiveHandicap,
  getPlayingHandicap,
  getStrokesOnHole,
} from '@/lib/handicaps';
import { shortName, scoreCellClass } from '@/lib/scoring-utils';

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
  onScoreClick: (
    roundParticipantId: string,
    holeNumber: number,
    currentStrokes?: number,
  ) => void;
  /** Which participant columns the current user may edit. Empty set = no editing. */
  editableParticipantIds?: Set<string>;
  /** Optional map of roundParticipantId → team hex colour for header colouring. */
  participantTeamColours?: Map<string, string>;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function Scorecard({
  holes,
  participants,
  scores,
  roundStatus,
  onScoreClick,
  editableParticipantIds,
  participantTeamColours,
}: ScorecardProps) {
  const canEdit = roundStatus === 'open';

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
    const cellEditable =
      canEdit &&
      (!editableParticipantIds || editableParticipantIds.has(participant.id));

    const handleScoreActivate = () => {
      if (cellEditable) {
        onScoreClick(participant.id, hole.holeNumber, cell?.strokes);
      }
    };

    const ariaLabel = cellEditable
      ? `Enter score for ${participant.person.displayName} on hole ${hole.holeNumber}`
      : `Score for ${participant.person.displayName} on hole ${hole.holeNumber}`;

    return (
      <td
        key={participant.id}
        className={cn(
          'relative h-10 min-w-12 border px-1 text-center text-sm',
          cell ? scoreCellClass(cell.strokes, hole.par) : '',
          cellEditable &&
            'hover:ring-primary cursor-pointer hover:ring-2 hover:ring-inset',
          canEdit && !cellEditable && 'bg-muted/50',
        )}
        onClick={handleScoreActivate}
        onKeyDown={(event) => {
          if (!cellEditable) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleScoreActivate();
          }
        }}
        role={cellEditable ? 'button' : undefined}
        tabIndex={cellEditable ? 0 : undefined}
        aria-label={ariaLabel}
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
      <td
        key={participantId}
        className="bg-muted/50 border px-1 text-center text-sm font-semibold"
      >
        {total != null ? (
          <span>
            {total}
            {diff != null && diff !== 0 && (
              <span
                className={cn(
                  'ml-1 text-xs',
                  diff > 0 ? 'text-red-500' : 'text-green-600',
                )}
              >
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
            <th className="bg-background sticky left-0 z-10 border px-2 py-1.5 text-left text-xs font-medium">
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
                style={
                  participantTeamColours?.has(p.id)
                    ? {
                        borderBottomColor: participantTeamColours.get(p.id),
                        borderBottomWidth: '2px',
                      }
                    : undefined
                }
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
              <td className="bg-background sticky left-0 z-10 border px-2 py-1 text-center text-xs font-medium">
                {hole.holeNumber}
              </td>
              <td className="text-muted-foreground border px-2 py-1 text-center text-xs">
                {hole.par}
              </td>
              <td className="text-muted-foreground border px-2 py-1 text-center text-xs">
                {hole.strokeIndex}
              </td>
              {participants.map((p, i) => renderScoreCell(p, i, hole))}
            </tr>
          ))}

          {/* Out row */}
          <tr className="bg-muted/30 font-semibold">
            <td className="bg-muted/30 sticky left-0 z-10 border px-2 py-1 text-center text-xs">
              Out
            </td>
            <td className="border px-2 py-1 text-center text-xs">{frontPar}</td>
            <td className="border px-2 py-1 text-center text-xs" />
            {participants.map((p) =>
              renderTotalCell(p.id, frontNine, frontPar),
            )}
          </tr>

          {/* Back 9 */}
          {hasBackNine && (
            <>
              {backNine.map((hole) => (
                <tr key={hole.holeNumber}>
                  <td className="bg-background sticky left-0 z-10 border px-2 py-1 text-center text-xs font-medium">
                    {hole.holeNumber}
                  </td>
                  <td className="text-muted-foreground border px-2 py-1 text-center text-xs">
                    {hole.par}
                  </td>
                  <td className="text-muted-foreground border px-2 py-1 text-center text-xs">
                    {hole.strokeIndex}
                  </td>
                  {participants.map((p, i) => renderScoreCell(p, i, hole))}
                </tr>
              ))}

              {/* In row */}
              <tr className="bg-muted/30 font-semibold">
                <td className="bg-muted/30 sticky left-0 z-10 border px-2 py-1 text-center text-xs">
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
            <td className="bg-muted/50 sticky left-0 z-10 border px-2 py-1.5 text-center text-xs">
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
