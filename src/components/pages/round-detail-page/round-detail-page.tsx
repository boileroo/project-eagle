import { Lock } from 'lucide-react';
import { useTransitionRound } from '@/lib/rounds';
import { useQueryClient } from '@tanstack/react-query';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  TeamCompetitionsSection,
  IndividualScoreboardSection,
  ParticipantsSection,
} from '@/components/pages/round-detail-page/components';
import { RoundHeader } from './components/round-header';
import { ScorecardSections } from './components/scorecard-sections';
import { buildMatchPairings } from './components/build-match-pairings';
import { statusLabels } from './components/constants';
import { buildTeamColourMap } from '@/lib/team-colours';
import { useRoundPermissions } from '@/hooks/use-round-permissions';
import type {
  RoundData,
  ScorecardData,
  RoundGamesData,
  SideGamesData,
  TournamentLoaderData,
} from '@/types';

export function RoundDetailPage({
  round,
  courses,
  scorecard,
  games,
  sideGames,
  tournament,
  myPerson,
  userId,
}: {
  round: RoundData;
  courses: Awaited<
    ReturnType<typeof import('@/lib/courses.server').getCoursesFn>
  >;
  scorecard: ScorecardData;
  games: RoundGamesData;
  sideGames: SideGamesData;
  tournament: TournamentLoaderData | null;
  myPerson: { id: string } | null;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [transitionRound, { isPending: isTransitioning }] =
    useTransitionRound();

  const invalidateRoundData = () => {
    void queryClient.invalidateQueries({ queryKey: ['round', round.id] });
    void queryClient.invalidateQueries({
      queryKey: ['game', 'round', round.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['side-game', 'round', round.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['individual-scoreboard', round.id],
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
  const hasAnyScores = Object.values(scorecard).some(
    (holes) => Object.keys(holes).length > 0,
  );

  const totalHoles = round.course.holes.length;
  const allScorecardsComplete = round.players.every(
    (rp) => Object.keys(scorecard[rp.id] ?? {}).length >= totalHoles,
  );

  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scoreTarget, setScoreTarget] = useState<{
    roundParticipantId: string;
    holeNumber: number;
    currentStrokes?: number;
    participantName: string;
    par: number;
  } | null>(null);

  const { isCommissioner, editableParticipantIds, getRecordingRole } =
    useRoundPermissions({
      round,
      tournament: tournament
        ? {
            id: tournament.id,
            createdByUserId: tournament.createdByUserId,
            players: tournament.players.map((player) => ({
              personId: player.personId,
              person: { userId: player.person.userId },
              role: player.role as 'player' | 'commissioner',
            })),
          }
        : undefined,
      userId,
    });

  const participantTeamColours = useMemo(() => {
    const teamMap = new Map<string, { id: string; createdAt: Date | string }>();
    for (const rp of round.players) {
      for (const tm of rp.player?.teamMemberships ?? []) {
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
    for (const rp of round.players) {
      const teamId = rp.player?.teamMemberships?.[0]?.team?.id;
      if (teamId) {
        const colour = tColours.get(teamId);
        if (colour) pColours.set(rp.id, colour);
      }
    }
    return pColours;
  }, [round.players]);

  const matchPairingsForGroups = useMemo(
    () => buildMatchPairings({ round, scorecard, games }),
    [games, round, scorecard],
  );

  const tournamentId = round.tournamentId;

  const handleTransition = async (
    newStatus: 'draft' | 'scheduled' | 'open' | 'finalized',
  ) => {
    await transitionRound({
      variables: { roundId: round.id, newStatus },
      onSuccess: () => {
        toast.success(`Round status changed to ${statusLabels[newStatus]}.`);
        invalidateRoundData();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleScoreClick = (
    rpId: string,
    holeNumber: number,
    currentStrokes?: number,
  ) => {
    const rp = round.players.find((p) => p.id === rpId);
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
      <RoundHeader
        round={round}
        courses={courses}
        isSingleRound={isSingleRound}
        isCommissioner={isCommissioner}
        inviteCode={round.tournament?.inviteCode ?? undefined}
        onTransition={handleTransition}
        onSaved={invalidateRoundData}
        isTransitioning={isTransitioning}
        hasAnyScores={hasAnyScores}
        allScorecardsComplete={allScorecardsComplete}
      />

      {round.status === 'scheduled' && (
        <div className="bg-surface-high flex items-start gap-3 rounded-xl px-4 py-3 text-sm">
          <Lock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Round is locked.</span>{' '}
            <span className="text-muted-foreground">
              No configuration changes are possible until the round is started.
            </span>
          </div>
        </div>
      )}

      {(isDraft || isScheduled) && (
        <ParticipantsSection
          tournament={tournament ?? undefined}
          round={round}
          isSingleRound={isSingleRound}
          games={games}
          isCommissioner={isCommissioner}
          userId={userId}
          myPerson={myPerson}
          onChanged={() => invalidateRoundData()}
          defaultOpen={isDraft || isScheduled}
        />
      )}

      <ScorecardSections
        round={round}
        scorecard={scorecard}
        matchPairingsForGroups={matchPairingsForGroups}
        editableParticipantIds={editableParticipantIds}
        participantTeamColours={participantTeamColours}
        games={games}
        isCommissioner={isCommissioner}
        onScoreClick={handleScoreClick}
        quickScoreProps={
          round.status === 'open' && editableParticipantIds.size > 0
            ? { tournamentId, roundId: round.id }
            : undefined
        }
      />

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

      {(round.status === 'open' || round.status === 'finalized') && (
        <IndividualScoreboardSection roundId={round.id} />
      )}

      {(isDraft || games.length > 0 || sideGames.length > 0) && (
        <TeamCompetitionsSection
          round={round}
          scorecard={scorecard}
          games={games}
          sideGames={sideGames}
          isCommissioner={isCommissioner}
          hasTeams={
            isSingleRound
              ? (tournament?.teams?.length ?? 0) > 0
              : round.players.some(
                  (rp) => (rp.player?.teamMemberships?.length ?? 0) > 0,
                )
          }
          onChanged={() => invalidateRoundData()}
        />
      )}
    </div>
  );
}
