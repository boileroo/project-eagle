// ──────────────────────────────────────────────
// LiveScoringPage — hole-by-hole mobile score entry
// Route: /tournaments/$tournamentId/rounds/$roundId/play
// ──────────────────────────────────────────────

import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  resolveEffectiveHandicap,
  getPlayingHandicap,
  getStrokesOnHole,
} from '@/lib/handicaps';
import {
  HoleHeader,
  PlayerScoreCard,
  HoleNavigation,
  RunningTotals,
  GroupSelector,
  BonusAwardControl,
  WolfDeclarationControl,
} from './components';
import { Button } from '@/components/ui/button';
import { useRoundPermissions } from '@/hooks/use-round-permissions';
import { useScoringResume } from '@/hooks/use-scoring-resume';
import type { RoundData, ScorecardData, RoundCompetitionsData } from '@/types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type LiveScoringPageProps = {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: RoundCompetitionsData;
  userId: string;
  /** Current hole number from URL search params (defaults handled in route) */
  currentHole: number;
  /** Selected group ID from URL search params */
  selectedGroupId: string | undefined;
  onHoleChange: (hole: number) => void;
  onGroupChange: (groupId: string) => void;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function LiveScoringPage({
  round,
  scorecard,
  competitions,
  userId,
  currentHole,
  selectedGroupId,
  onHoleChange,
  onGroupChange,
}: LiveScoringPageProps) {
  const queryClient = useQueryClient();
  const holes = useMemo(() => round.course?.holes ?? [], [round.course?.holes]);
  const totalHoles = holes.length;

  // ── Role derivation ──────────────────────────
  const {
    isCommissioner,
    isMarkerOrCommissioner,
    myParticipant,
    editableParticipantIds,
    getRecordingRole,
  } = useRoundPermissions({ round, userId });

  // ── Group selection ──────────────────────────
  const myGroupId = myParticipant
    ? round.groups.find((g) =>
        g.participants.some((gp) => gp.id === myParticipant.id),
      )?.id
    : undefined;

  const activeGroupId = selectedGroupId ?? myGroupId ?? round.groups[0]?.id;
  const activeGroup = round.groups.find((g) => g.id === activeGroupId);

  // Resolve full participant data for each group member
  // If no groups exist, show all participants
  const groupParticipants = useMemo(() => {
    if (!activeGroup) {
      // No groups - show all participants (e.g., for quick rounds with ≤4 players)
      return round.participants;
    }
    return activeGroup.participants
      .map((gp) => round.participants.find((rp) => rp.id === gp.id))
      .filter((rp): rp is NonNullable<typeof rp> => rp != null);
  }, [activeGroup, round.participants]);

  // ── Smart resume: on mount, jump to last/first unscored hole ────────────
  useScoringResume({
    roundId: round.id,
    totalHoles,
    holes,
    groupParticipants,
    scorecard,
    currentHole,
    onHoleChange,
  });

  // ── Current hole data ────────────────────────
  const holeData = holes.find((h) => h.holeNumber === currentHole);

  // ── Scored holes (for navigation dots) ──────
  const scoredHoles = useMemo(() => {
    const set = new Set<number>();
    for (const h of holes) {
      if (
        groupParticipants.length > 0 &&
        groupParticipants.some((p) => scorecard[p.id]?.[h.holeNumber] != null)
      ) {
        set.add(h.holeNumber);
      }
    }
    return set;
  }, [holes, groupParticipants, scorecard]);

  // ── Invalidate competitions after bonus award change ─
  const invalidateCompetitions = () => {
    void queryClient.invalidateQueries({
      queryKey: ['competition', 'round', round.id],
    });
  };

  // ── Navigation ───────────────────────────────
  const goTo = (hole: number) => {
    if (hole < 1 || hole > totalHoles) return;
    onHoleChange(hole);
  };

  // ── Guard: no holes on course ────────────────
  if (totalHoles === 0 || !holeData) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-muted-foreground text-sm">No hole data available.</p>
        <Button variant="outline" asChild>
          <Link
            to="/tournaments/$tournamentId/rounds/$roundId"
            params={{
              tournamentId: round.tournamentId,
              roundId: round.id,
            }}
          >
            Back to round
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* ── Scrollable content ─────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg space-y-4 px-4 pb-4">
          {/* Header bar: back link + group selector */}
          <div className="flex items-center justify-between pt-3">
            <Link
              to="/tournaments/$tournamentId/rounds/$roundId"
              params={{
                tournamentId: round.tournamentId,
                roundId: round.id,
              }}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Round
            </Link>
            {isMarkerOrCommissioner && (
              <GroupSelector
                groups={round.groups}
                selectedGroupId={activeGroupId ?? ''}
                onChange={onGroupChange}
              />
            )}
          </div>

          {/* Hole info */}
          <HoleHeader
            holeNumber={currentHole}
            totalHoles={totalHoles}
            par={holeData.par}
            strokeIndex={holeData.strokeIndex}
            yardage={holeData.yardage}
          />

          {/* Player score cards */}
          <div className="space-y-3">
            {groupParticipants.map((rp) => {
              const hc = resolveEffectiveHandicap(rp);
              const playingHc = getPlayingHandicap(hc);
              const strokesReceived = getStrokesOnHole(
                playingHc,
                holeData.strokeIndex,
              );
              const strokes = scorecard[rp.id]?.[currentHole]?.strokes;

              return (
                <PlayerScoreCard
                  key={rp.id}
                  roundId={round.id}
                  roundParticipantId={rp.id}
                  displayName={rp.person.displayName}
                  holeNumber={currentHole}
                  par={holeData.par}
                  strokesReceived={strokesReceived}
                  strokes={strokes}
                  recordedByRole={getRecordingRole(rp.id)}
                  isEditable={editableParticipantIds.has(rp.id)}
                />
              );
            })}

            {groupParticipants.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No players in this group.
              </p>
            )}
          </div>

          {/* Bonus award controls */}
          <BonusAwardControl
            competitions={competitions}
            holeNumber={currentHole}
            participants={groupParticipants}
            canAward={isMarkerOrCommissioner}
            canRemove={isCommissioner}
            onChanged={invalidateCompetitions}
          />

          {/* Wolf declaration */}
          <WolfDeclarationControl
            round={round}
            competitions={competitions}
            holeNumber={currentHole}
            groupParticipants={groupParticipants}
            canDeclare={isMarkerOrCommissioner}
          />

          {/* Running totals */}
          <RunningTotals
            participants={groupParticipants.map((rp) => ({
              id: rp.id,
              displayName: rp.person.displayName,
            }))}
            scores={scorecard}
            holes={holes}
          />
        </div>
      </div>

      {/* ── Fixed navigation ───────────────────── */}
      <HoleNavigation
        currentHole={currentHole}
        totalHoles={totalHoles}
        onPrev={() => goTo(currentHole - 1)}
        onNext={() => goTo(currentHole + 1)}
        scoredHoles={scoredHoles}
      />
    </div>
  );
}
