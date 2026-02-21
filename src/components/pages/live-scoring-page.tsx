// ──────────────────────────────────────────────
// LiveScoringPage — hole-by-hole mobile score entry
// Route: /tournaments/$tournamentId/rounds/$roundId/play
// ──────────────────────────────────────────────

import { useMemo, useEffect } from 'react';
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
} from '@/components/live-scoring';
import { Button } from '@/components/ui/button';
import type {
  RoundData,
  ScorecardData,
  CompetitionsData,
} from '@/components/round-detail/types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type LiveScoringPageProps = {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: CompetitionsData;
  userId: string;
  /** Current hole number from URL search params (defaults handled in route) */
  currentHole: number;
  /** Selected group ID from URL search params */
  selectedGroupId: string | undefined;
  onHoleChange: (hole: number) => void;
  onGroupChange: (groupId: string) => void;
};

const HOLE_STORAGE_KEY_PREFIX = 'eagle-live-hole-';

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
  const holes = round.course?.holes ?? [];
  const totalHoles = holes.length;

  // ── Role derivation ──────────────────────────
  const myParticipant = round.participants.find(
    (rp) => rp.person.userId === userId,
  );
  const myRole = myParticipant?.tournamentParticipant?.role;
  const isCommissioner = myRole === 'commissioner';
  const isMarkerOrCommissioner =
    myRole === 'marker' || myRole === 'commissioner';

  // ── Editable participant IDs ─────────────────
  const editableParticipantIds = useMemo(() => {
    const set = new Set<string>();
    if (round.status !== 'open') return set;
    if (isMarkerOrCommissioner) {
      for (const rp of round.participants) set.add(rp.id);
    } else if (myParticipant) {
      set.add(myParticipant.id);
    }
    return set;
  }, [round.participants, round.status, isMarkerOrCommissioner, myParticipant]);

  // ── Group selection ──────────────────────────
  const myGroupId = myParticipant
    ? round.groups.find((g) =>
        g.participants.some((gp) => gp.id === myParticipant.id),
      )?.id
    : undefined;

  const activeGroupId = selectedGroupId ?? myGroupId ?? round.groups[0]?.id;
  const activeGroup = round.groups.find((g) => g.id === activeGroupId);

  // Resolve full participant data for each group member
  const groupParticipants = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.participants
      .map((gp) => round.participants.find((rp) => rp.id === gp.id))
      .filter((rp): rp is NonNullable<typeof rp> => rp != null);
  }, [activeGroup, round.participants]);

  // ── Smart resume: on mount, jump to last/first unscored hole ────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (totalHoles === 0) return;

    // If the URL already has an explicit hole param, honour it
    // (The route passes currentHole=1 as default, so check localStorage first)
    const stored = window.localStorage.getItem(
      `${HOLE_STORAGE_KEY_PREFIX}${round.id}`,
    );
    const storedHole = stored ? parseInt(stored, 10) : null;
    if (storedHole && storedHole >= 1 && storedHole <= totalHoles) {
      onHoleChange(storedHole);
      return;
    }

    // Fall back to first hole where none of the group has a score
    if (groupParticipants.length > 0) {
      const firstUnscored = holes.find((h) =>
        groupParticipants.every((p) => !scorecard[p.id]?.[h.holeNumber]),
      );
      onHoleChange(firstUnscored?.holeNumber ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]); // Intentionally only run on mount

  // ── Persist current hole to localStorage ────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `${HOLE_STORAGE_KEY_PREFIX}${round.id}`,
      String(currentHole),
    );
  }, [round.id, currentHole]);

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

  // ── Recording role helper ────────────────────
  const getRecordingRole = (
    rpId: string,
  ): 'player' | 'marker' | 'commissioner' => {
    if (isCommissioner) return 'commissioner';
    const rp = round.participants.find((p) => p.id === rpId);
    if (rp?.person.userId === userId) return 'player';
    return 'marker';
  };

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
