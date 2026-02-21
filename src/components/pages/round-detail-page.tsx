import { Link, useNavigate } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import {
  getRoundFn,
  deleteRoundFn,
  transitionRoundFn,
} from '@/lib/rounds.server';
import { deleteTournamentFn, getTournamentFn } from '@/lib/tournaments.server';
import { getScorecardFn } from '@/lib/scores.server';
import { getRoundCompetitionsFn } from '@/lib/competitions.server';
import { useQueryClient } from '@tanstack/react-query';
import { Scorecard } from '@/components/scorecard';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  EditRoundDialog,
  PlayersAndGroupsSection,
  CompetitionsSection,
  SingleRoundPlayersSection,
} from '@/components/round-detail';
import {
  statusColors,
  statusLabels,
  nextTransitions,
} from '@/components/round-detail/constants';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type RoundData = Awaited<ReturnType<typeof getRoundFn>>;
type ScorecardData = Awaited<ReturnType<typeof getScorecardFn>>;
type CompetitionsData = Awaited<ReturnType<typeof getRoundCompetitionsFn>>;
type TournamentData = Awaited<ReturnType<typeof getTournamentFn>>;

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
  competitions: CompetitionsData;
  tournament: TournamentData | null;
  myPerson: { id: string } | null;
  userId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

    // Find the current user's tournament role
    const myRoundParticipant = round.participants.find(
      (rp) => rp.person.userId === userId,
    );
    const myTournamentRole = myRoundParticipant?.tournamentParticipant?.role;

    if (myTournamentRole === 'commissioner' || myTournamentRole === 'marker') {
      // Commissioners and markers can score everyone
      for (const rp of round.participants) {
        set.add(rp.id);
      }
    } else if (myRoundParticipant) {
      // Regular players can only score their own card
      set.add(myRoundParticipant.id);
    }
    // Non-participants get an empty set (no editing)
    return set;
  }, [round.participants, round.status, userId]);

  const tournamentId = round.tournamentId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isSingleRound) {
        await deleteTournamentFn({ data: { tournamentId } });
        toast.success('Round deleted.');
        navigate({ to: '/' });
      } else {
        await deleteRoundFn({ data: { roundId: round.id } });
        toast.success('Round deleted.');
        navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId },
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete round',
      );
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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

  const transitions = nextTransitions[round.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {!isSingleRound && (
            <div className="text-muted-foreground mb-1 text-sm">
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId }}
                className="hover:text-primary underline"
              >
                ← {round.tournament?.name ?? 'Tournament'}
              </Link>
            </div>
          )}
          {isSingleRound && (
            <div className="text-muted-foreground mb-1 text-sm">
              <Link to="/" className="hover:text-primary underline">
                ← Dashboard
              </Link>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight">
            {isSingleRound
              ? round.course.name
              : `Round ${round.roundNumber ?? '—'}`}
          </h1>
          <div className="text-muted-foreground mt-1 flex items-center gap-3">
            <Link
              to="/courses/$courseId"
              params={{ courseId: round.course.id }}
              className="hover:text-primary hover:underline"
            >
              @ {round.course.name}
            </Link>
            {round.date && (
              <span>
                {new Date(round.date).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {(round as { teeTime?: string | null }).teeTime && (
                  <> · {(round as { teeTime?: string | null }).teeTime}</>
                )}
              </span>
            )}
            <Badge variant={statusColors[round.status]}>
              {statusLabels[round.status]}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Scoring — shown when round is open and user can score */}
          {round.status === 'open' && editableParticipantIds.size > 0 && (
            <Button size="sm" asChild>
              <Link
                to="/tournaments/$tournamentId/rounds/$roundId/play"
                params={{ tournamentId, roundId: round.id }}
                search={{ hole: 1, group: undefined }}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Live Scoring
              </Link>
            </Button>
          )}

          {isCommissioner && isDraft && (
            <EditRoundDialog
              round={round}
              courses={courses}
              onSaved={() => invalidateRoundData()}
            />
          )}

          {isCommissioner &&
            transitions.map((t) => (
              <Button
                key={t.status}
                size="sm"
                variant={
                  t.status === 'draft' || t.status === 'open'
                    ? 'outline'
                    : 'default'
                }
                onClick={() =>
                  handleTransition(
                    t.status as 'draft' | 'scheduled' | 'open' | 'finalized',
                  )
                }
              >
                {t.label}
              </Button>
            ))}

          {isCommissioner && round.status === 'draft' && (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete round?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete Round{' '}
                    {round.roundNumber ?? '—'} and all its participants and
                    scores. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Separator />

      {/* For single rounds: show tournament-level Players panel */}
      {isSingleRound && tournament && (
        <SingleRoundPlayersSection
          tournament={tournament}
          roundId={round.id}
          isCommissioner={isCommissioner}
          userId={userId}
          myPerson={myPerson}
          onChanged={() => invalidateRoundData()}
          defaultOpen={isDraft || isScheduled}
        />
      )}

      {/* Players & Groups — hidden for single rounds */}
      {!isSingleRound && (
        <PlayersAndGroupsSection
          round={round}
          isCommissioner={isCommissioner}
          userId={userId}
          onChanged={() => invalidateRoundData()}
          defaultOpen={isDraft || isScheduled}
        />
      )}

      {/* Scorecards — one per group, visible when round is open or finalized */}
      {round.status !== 'draft' &&
        round.status !== 'scheduled' &&
        round.participants.length > 0 &&
        (() => {
          const groups = round.groups ?? [];
          const ungrouped = round.participants.filter((rp) => !rp.roundGroupId);

          const sections: {
            label: string;
            participants: typeof round.participants;
          }[] = [];
          for (const g of groups) {
            const groupParticipants = round.participants.filter(
              (rp) => rp.roundGroupId === g.id,
            );
            if (groupParticipants.length > 0) {
              sections.push({
                label: g.name ?? `Group ${g.groupNumber}`,
                participants: groupParticipants,
              });
            }
          }
          if (ungrouped.length > 0) {
            sections.push({ label: 'Ungrouped', participants: ungrouped });
          }
          if (sections.length === 0) {
            sections.push({
              label: 'Scorecard',
              participants: round.participants,
            });
          }

          const handleScoreClick = (
            rpId: string,
            holeNumber: number,
            currentStrokes?: number,
          ) => {
            const rp = round.participants.find((p) => p.id === rpId);
            const hole = round.course.holes.find(
              (h) => h.holeNumber === holeNumber,
            );
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

          return sections.map((section) => (
            <Card key={section.label}>
              <CardHeader>
                <CardTitle className="text-lg">{section.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <Scorecard
                  holes={round.course.holes}
                  participants={section.participants}
                  scores={scorecard}
                  roundStatus={round.status}
                  onScoreClick={handleScoreClick}
                  editableParticipantIds={editableParticipantIds}
                />
              </CardContent>
            </Card>
          ));
        })()}

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

      {/* Competitions */}
      <CompetitionsSection
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
