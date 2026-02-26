import { Link } from '@tanstack/react-router';
import { Play, Lock } from 'lucide-react';
import { transitionRoundFn } from '@/lib/rounds.server';
import { useQueryClient } from '@tanstack/react-query';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  TeamCompetitionsSection,
  IndividualScoreboardSection,
  ParticipantsSection,
} from '@/components/pages/round-detail-page/components';
import { RoundStepIndicator } from './components/round-step-indicator';
import { RoundHeader } from './components/round-header';
import { ScorecardSections } from './components/scorecard-sections';
import { buildMatchPairings } from './components/build-match-pairings';
import { statusLabels } from './components/constants';
import { buildTeamColourMap } from '@/lib/team-colours';
import type {
  RoundData,
  ScorecardData,
  RoundCompetitionsData,
  TournamentLoaderData,
} from '@/types';

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────

export function RoundDetailPage({
  round,
  courses,
  scorecard,
  competitions,
  tournament,
  myPerson,
  userId,
}: {
  round: RoundData;
  courses: Awaited<
    ReturnType<typeof import('@/lib/courses.server').getCoursesFn>
  >;
  scorecard: ScorecardData;
  competitions: RoundCompetitionsData;
  tournament: TournamentLoaderData | null;
  myPerson: { id: string } | null;
  userId: string;
}) {
  const queryClient = useQueryClient();

  const invalidateRoundData = () => {
    void queryClient.invalidateQueries({ queryKey: ['round', round.id] });
    void queryClient.invalidateQueries({
      queryKey: ['competition', 'round', round.id],
    });
    if (isSingleRound) {
      void queryClient.invalidateQueries({
        queryKey: ['tournament', round.tournamentId],
      });
    }
  };

  const isDraft = round.status === 'draft';
  const isScheduled = round.status === 'scheduled';
  const isSingleRound = round.tournament?.isSingleRound ?? false;

  // Score entry dialog state
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scoreTarget, setScoreTarget] = useState<{
    roundParticipantId: string;
    holeNumber: number;
    currentStrokes?: number;
    participantName: string;
    par: number;
  } | null>(null);

  // Determine if current user is commissioner of this tournament
  const isCommissioner = round.participants.some(
    (rp) =>
      rp.person.userId === userId &&
      rp.tournamentParticipant?.role === 'commissioner',
  );

  // Determine the recording role for the current user
  const getRecordingRole = (
    roundParticipantId: string,
  ): 'player' | 'marker' | 'commissioner' => {
    if (isCommissioner) return 'commissioner';
    const rp = round.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === userId) return 'player';
    return 'marker';
  };

  // Compute which participants the current user can edit scores for
  const editableParticipantIds = useMemo(() => {
    const set = new Set<string>();
    if (round.status !== 'open') return set;

    const myRoundParticipant = round.participants.find(
      (rp) => rp.person.userId === userId,
    );
    const myTournamentRole = myRoundParticipant?.tournamentParticipant?.role;

    if (myTournamentRole === 'commissioner' || myTournamentRole === 'marker') {
      for (const rp of round.participants) {
        set.add(rp.id);
      }
    } else if (myRoundParticipant) {
      set.add(myRoundParticipant.id);
    }
    return set;
  }, [round.participants, round.status, userId]);

  // Build participant team colour map (roundParticipantId → hex)
  const participantTeamColours = useMemo(() => {
    const teamMap = new Map<string, { id: string; createdAt: Date | string }>();
    for (const rp of round.participants) {
      for (const tm of rp.tournamentParticipant?.teamMemberships ?? []) {
        if (!teamMap.has(tm.team.id)) {
          teamMap.set(tm.team.id, tm.team);
        }
      }
    }
    const sortedTeams = [...teamMap.values()].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const tColours = buildTeamColourMap(sortedTeams);
    const pColours = new Map<string, string>();
    for (const rp of round.participants) {
      const teamId = rp.tournamentParticipant?.teamMemberships?.[0]?.team?.id;
      if (teamId) {
        const colour = tColours.get(teamId);
        if (colour) pColours.set(rp.id, colour);
      }
    }
    return pColours;
  }, [round.participants]);

  // Compute match pairings per group
  const matchPairingsForGroups = useMemo(
    () => buildMatchPairings({ round, scorecard, competitions }),
    [competitions, round, scorecard],
  );

  const tournamentId = round.tournamentId;

  const handleTransition = async (
    newStatus: 'draft' | 'scheduled' | 'open' | 'finalized',
  ) => {
    try {
      await transitionRoundFn({ data: { roundId: round.id, newStatus } });
      toast.success(`Round status changed to ${statusLabels[newStatus]}.`);
      invalidateRoundData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to change status',
      );
    }
  };

  const handleScoreClick = (
    rpId: string,
    holeNumber: number,
    currentStrokes?: number,
  ) => {
    const rp = round.participants.find((p) => p.id === rpId);
    const hole = round.course.holes.find((h) => h.holeNumber === holeNumber);
    if (!rp || !hole) return;
    setScoreTarget({
      roundParticipantId: rpId,
      holeNumber,
      currentStrokes,
      participantName: rp.person.displayName,
      par: hole.par,
    });
    setScoreDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <RoundHeader
        round={round}
        courses={courses}
        isSingleRound={isSingleRound}
        isCommissioner={isCommissioner}
        onTransition={handleTransition}
        onSaved={invalidateRoundData}
      />

      <Separator />

      {/* Round step indicator */}
      <RoundStepIndicator status={round.status} />

      {/* Locked banner — shown when round is awaiting start */}
      {round.status === 'scheduled' && (
        <div className="bg-muted/50 flex items-start gap-3 rounded-md border px-4 py-3 text-sm">
          <Lock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Round is locked.</span>{' '}
            <span className="text-muted-foreground">
              No configuration changes are possible until the round is started.
            </span>
          </div>
        </div>
      )}

      {/* Participants Section - handles Players, Teams, and Groups tabs */}
      <ParticipantsSection
        tournament={tournament ?? undefined}
        round={round}
        isSingleRound={isSingleRound}
        competitions={competitions}
        isCommissioner={isCommissioner}
        userId={userId}
        myPerson={myPerson}
        onChanged={() => invalidateRoundData()}
        defaultOpen={isDraft || isScheduled}
      />

      {/* Quick Score button — shown when round is open and user can score */}
      {round.status === 'open' && editableParticipantIds.size > 0 && (
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link
              to="/tournaments/$tournamentId/rounds/$roundId/play"
              params={{ tournamentId, roundId: round.id }}
              search={{ hole: 1, group: undefined }}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Quick Score
            </Link>
          </Button>
        </div>
      )}

      {/* Scorecards — one per group, visible when round is open or finalized */}
      <ScorecardSections
        round={round}
        scorecard={scorecard}
        matchPairingsForGroups={matchPairingsForGroups}
        editableParticipantIds={editableParticipantIds}
        participantTeamColours={participantTeamColours}
        onScoreClick={handleScoreClick}
      />

      {/* Score entry dialog */}
      {scoreTarget && (
        <ScoreEntryDialog
          open={scoreDialogOpen}
          onOpenChange={setScoreDialogOpen}
          roundId={round.id}
          roundParticipantId={scoreTarget.roundParticipantId}
          participantName={scoreTarget.participantName}
          holeNumber={scoreTarget.holeNumber}
          par={scoreTarget.par}
          currentStrokes={scoreTarget.currentStrokes}
          recordedByRole={getRecordingRole(scoreTarget.roundParticipantId)}
        />
      )}

      {/* Individual Scoreboard — shown when round is open or finalized */}
      {(round.status === 'open' || round.status === 'finalized') && (
        <IndividualScoreboardSection roundId={round.id} />
      )}

      {/* Team Competitions */}
      <TeamCompetitionsSection
        round={round}
        scorecard={scorecard}
        competitions={competitions}
        isCommissioner={isCommissioner}
        hasTeams={
          isSingleRound
            ? (tournament?.teams?.length ?? 0) > 0
            : round.participants.some(
                (rp) =>
                  (rp.tournamentParticipant?.teamMemberships?.length ?? 0) > 0,
              )
        }
        onChanged={() => invalidateRoundData()}
      />
    </div>
  );
}
