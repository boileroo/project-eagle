import { Link, useNavigate } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';
import {
  getRoundFn,
  deleteRoundFn,
  transitionRoundFn,
} from '@/lib/rounds.server';
import { deleteTournamentFn, getTournamentFn } from '@/lib/tournaments.server';
import { getScorecardFn } from '@/lib/scores.server';
import { getRoundCompetitionsFn } from '@/lib/competitions.server';
import { Scorecard } from '@/components/scorecard';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { ScoreHistoryDialog } from '@/components/score-history-dialog';
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
import { useState } from 'react';
import { toast } from 'sonner';
import {
  EditRoundDialog,
  PlayersAndGroupsSection,
  CompetitionsSection,
  SingleRoundPlayersSection,
} from '@/components/round-detail';
import { statusColors, statusLabels, nextTransitions } from '@/components/round-detail/constants';

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
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  // Score history dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{
    roundParticipantId: string;
    holeNumber: number;
    participantName: string;
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
    const rp = round.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === userId) return 'player';
    return 'marker';
  };

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

  const handleTransition = async (newStatus: string) => {
    try {
      await transitionRoundFn({ data: { roundId: round.id, newStatus } });
      toast.success(`Round status changed to ${statusLabels[newStatus]}.`);
      router.invalidate();
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
            <span>@ {round.course.name}</span>
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
          {isCommissioner && round.status === 'draft' && (
            <EditRoundDialog
              round={round}
              courses={courses}
              onSaved={() => router.invalidate()}
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
                onClick={() => handleTransition(t.status)}
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

      {/* Course info — hidden for single rounds since the course name is in the title */}
      {!isSingleRound && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{round.course.name}</p>
                {round.course.location && (
                  <p className="text-muted-foreground text-sm">
                    {round.course.location}
                  </p>
                )}
              </div>
              <Badge variant="secondary">
                {round.course.numberOfHoles} holes
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* For single rounds: show tournament-level Players panel */}
      {isSingleRound && tournament && (
        <SingleRoundPlayersSection
          tournament={tournament}
          roundId={round.id}
          isCommissioner={isCommissioner}
          userId={userId}
          myPerson={myPerson}
          onChanged={() => router.invalidate()}
        />
      )}

      {/* Players & Groups — hidden for single rounds */}
      {!isSingleRound && (
        <PlayersAndGroupsSection
          round={round}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
        />
      )}

      {/* Scorecards — one per group, visible when round is not draft */}
      {round.status !== 'draft' &&
        round.participants.length > 0 &&
        (() => {
          const groups = round.groups ?? [];
          const ungrouped = round.participants.filter(
            (rp) => !rp.roundGroupId,
          );

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

          const handleHistoryClick = (rpId: string, holeNumber: number) => {
            const rp = round.participants.find((p) => p.id === rpId);
            if (!rp) return;
            setHistoryTarget({
              roundParticipantId: rpId,
              holeNumber,
              participantName: rp.person.displayName,
            });
            setHistoryDialogOpen(true);
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
                  onHistoryClick={handleHistoryClick}
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
          onSaved={() => router.invalidate()}
        />
      )}

      {/* Score history dialog */}
      {historyTarget && (
        <ScoreHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          roundParticipantId={historyTarget.roundParticipantId}
          holeNumber={historyTarget.holeNumber}
          participantName={historyTarget.participantName}
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
        onChanged={() => router.invalidate()}
      />
    </div>
  );
}
