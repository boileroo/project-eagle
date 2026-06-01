import { cn } from '@/lib/utils';
import {
  resolveEffectiveHandicap,
  getPlayingHandicap,
  getStrokesOnHole,
  formatHandicapAdjustment,
  formatHandicap,
} from '@/lib/handicaps';
import { shortName } from '@/lib/scoring-utils';

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
  /** Optional map of holeNumber → roundParticipantId for the wolf on that hole. */
  wolfParticipantIds?: Map<number, string>;
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
  wolfParticipantIds,
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
    const handicapAdjustment = getStrokesOnHole(
      playingHCs[participantIdx],
      hole.strokeIndex,
    );
    const cellEditable =
      canEdit &&
      (!editableParticipantIds || editableParticipantIds.has(participant.id));
    const isWolf = wolfParticipantIds?.get(hole.holeNumber) === participant.id;

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
          '',
          cellEditable &&
            'hover:ring-primary cursor-pointer hover:ring-2 hover:ring-inset',
          canEdit && !cellEditable && 'bg-surface-high',
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
        {isWolf && (
          <span className="text-primary absolute top-0.5 left-0.5 text-[9px] leading-none font-bold">
            W
          </span>
        )}
        {handicapAdjustment !== 0 && (
          <span
            className="text-muted-foreground absolute top-0.5 right-0.5 text-[9px] font-medium"
            title={formatHandicapAdjustment(handicapAdjustment)}
          >
            {handicapAdjustment > 0
              ? `+${handicapAdjustment}`
              : `G${Math.abs(handicapAdjustment)}`}
          </span>
        )}
      </td>
    );
  };

  const renderTotalCell = (
    participantId: string,
    holeList: Hole[],
    _par: number,
  ) => {
    const total = getTotal(participantId, holeList);
    const ps = scores[participantId];
    const scoredPar =
      total != null && ps
        ? holeList.reduce((s, h) => (ps[h.holeNumber] ? s + h.par : s), 0)
        : null;
    const diff = total != null && scoredPar != null ? total - scoredPar : null;
    return (
      <td
        key={participantId}
        className="bg-surface-high border px-1 text-center text-sm font-semibold"
      >
        {total != null ? (
          <span>
            {total}
            {diff != null && diff !== 0 && (
              <span
                className={cn(
                  'ml-1 text-xs',
                  diff > 0 ? 'text-destructive' : 'text-success',
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
          <tr className="bg-surface-high font-semibold">
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
                title={`${p.person.displayName} (HC ${formatHandicap(playingHCs[i]) ?? '-'})`}
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
          <tr className="bg-surface-high font-semibold">
            <td className="bg-surface-high sticky left-0 z-10 border px-2 py-1 text-center text-xs">
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
              <tr className="bg-surface-high font-semibold">
                <td className="bg-surface-high sticky left-0 z-10 border px-2 py-1 text-center text-xs">
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
          <tr className="bg-surface-high font-bold">
            <td className="bg-surface-high sticky left-0 z-10 border px-2 py-1.5 text-center text-xs">
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
