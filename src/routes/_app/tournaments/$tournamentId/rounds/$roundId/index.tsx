import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  getRoundFn,
  deleteRoundFn,
  transitionRoundFn,
  removeRoundParticipantFn,
  updateRoundParticipantFn,
  updateRoundFn,
} from '@/lib/rounds.server';
import { getCoursesFn } from '@/lib/courses.server';
import { getScorecardFn } from '@/lib/scores.server';
import {
  getRoundCompetitionsFn,
  createCompetitionFn,
  deleteCompetitionFn,
  awardBonusFn,
  removeBonusAwardFn,
} from '@/lib/competitions.server';
import { Scorecard } from '@/components/scorecard';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { ScoreHistoryDialog } from '@/components/score-history-dialog';
import { CompetitionResults } from '@/components/competition-results';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@tanstack/react-router';
import {
  FORMAT_TYPE_LABELS,
  FORMAT_TYPES,
  isBonusFormat,
} from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import {
  calculateCompetitionResults,
  type CompetitionInput,
  type HoleData,
  type ParticipantData,
  type ResolvedScore,
} from '@/lib/domain';
import {
  resolveEffectiveHandicap,
  getPlayingHandicap,
} from '@/lib/handicaps';

export const Route = createFileRoute(
  '/_app/tournaments/$tournamentId/rounds/$roundId/',
)({
  loader: async ({ params }) => {
    const [round, courses, scorecard, competitions] = await Promise.all([
      getRoundFn({ data: { roundId: params.roundId } }),
      getCoursesFn(),
      getScorecardFn({ data: { roundId: params.roundId } }),
      getRoundCompetitionsFn({
        data: { roundId: params.roundId },
      }),
    ]);
    return { round, courses, scorecard, competitions };
  },
  component: RoundDetailPage,
});

const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  open: 'secondary',
  locked: 'default',
  finalized: 'default',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  locked: 'Locked',
  finalized: 'Finalized',
};

const nextTransitions: Record<string, { label: string; status: string }[]> = {
  draft: [{ label: 'Open Round', status: 'open' }],
  open: [
    { label: 'Lock Round', status: 'locked' },
    { label: 'Back to Draft', status: 'draft' },
  ],
  locked: [
    { label: 'Finalize', status: 'finalized' },
    { label: 'Reopen', status: 'open' },
  ],
  finalized: [{ label: 'Unlock for Corrections', status: 'locked' }],
};

function RoundDetailPage() {
  const { round, courses, scorecard, competitions } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      rp.person.userId === user.id &&
      rp.tournamentParticipant?.role === 'commissioner',
  );

  // Determine the recording role for the current user
  const getRecordingRole = (roundParticipantId: string): 'player' | 'marker' | 'commissioner' => {
    const rp = round.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === user.id) return 'player';
    return 'marker';
  };

  const tournamentId = round.tournamentId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRoundFn({ data: { roundId: round.id } });
      toast.success('Round deleted.');
      navigate({
        to: '/tournaments/$tournamentId',
        params: { tournamentId },
      });
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

  const handleRemoveParticipant = async (
    rpId: string,
    name: string,
  ) => {
    try {
      await removeRoundParticipantFn({ data: { roundParticipantId: rpId } });
      toast.success(`${name} removed from round.`);
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove participant',
      );
    }
  };

  const transitions = nextTransitions[round.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-muted-foreground mb-1 text-sm">
            <Link
              to="/tournaments/$tournamentId"
              params={{ tournamentId }}
              className="hover:text-primary underline"
            >
              ← {round.tournament?.name ?? 'Tournament'}
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Round {round.roundNumber ?? '—'}
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

          {isCommissioner && transitions.map((t) => (
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

      {/* Course info */}
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

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Players in this Round</span>
            <Badge variant="secondary">
              {round.participants.length} player
              {round.participants.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {round.participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No players in this round.
            </p>
          ) : (
            <div className="space-y-2">
              {round.participants.map((rp) => (
                <div
                  key={rp.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {rp.person.displayName}
                    </span>
                    {rp.person.userId == null && (
                      <Badge variant="outline" className="text-xs">
                        Guest
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      HC {rp.handicapOverride ?? rp.handicapSnapshot}
                    </Badge>
                    {rp.handicapOverride && (
                      <span className="text-muted-foreground text-xs">
                        (snap: {rp.handicapSnapshot})
                      </span>
                    )}
                    {(round.status === 'draft' || round.status === 'open') && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          ⋯
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditRoundHandicapDialog
                          roundParticipant={rp}
                          onSaved={() => router.invalidate()}
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            handleRemoveParticipant(
                              rp.id,
                              rp.person.displayName,
                            )
                          }
                        >
                          Remove from Round
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scorecard — visible when round is not draft */}
      {round.status !== 'draft' && round.participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scorecard</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <Scorecard
              holes={round.course.holes}
              participants={round.participants}
              scores={scorecard}
              roundStatus={round.status}
              onScoreClick={(rpId, holeNumber, currentStrokes) => {
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
              }}
              onHistoryClick={(rpId, holeNumber) => {
                const rp = round.participants.find((p) => p.id === rpId);
                if (!rp) return;
                setHistoryTarget({
                  roundParticipantId: rpId,
                  holeNumber,
                  participantName: rp.person.displayName,
                });
                setHistoryDialogOpen(true);
              }}
            />
          </CardContent>
        </Card>
      )}

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
        onChanged={() => router.invalidate()}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Edit Round Details Dialog (course, date, tee time)
// ──────────────────────────────────────────────

function EditRoundDialog({
  round,
  courses,
  onSaved,
}: {
  round: {
    id: string;
    courseId: string | null;
    date: string | Date | null;
    teeTime?: string | null;
  };
  courses: { id: string; name: string; location: string | null; numberOfHoles: number }[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseId, setCourseId] = useState(round.courseId ?? '');
  const [date, setDate] = useState(() => {
    if (!round.date) return '';
    const d = new Date(round.date);
    return d.toISOString().split('T')[0];
  });
  const [teeTime, setTeeTime] = useState(
    (round as { teeTime?: string | null }).teeTime ?? '',
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRoundFn({
        data: {
          id: round.id,
          courseId: courseId || undefined,
          date: date || undefined,
          teeTime: teeTime || undefined,
        },
      });
      toast.success('Round updated.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update round',
      );
    }
    setSaving(false);
  };

  // Reset form when dialog opens
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setCourseId(round.courseId ?? '');
      setDate(() => {
        if (!round.date) return '';
        const d = new Date(round.date);
        return d.toISOString().split('T')[0];
      });
      setTeeTime((round as { teeTime?: string | null }).teeTime ?? '');
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Round</DialogTitle>
          <DialogDescription>
            Change the course, date, or tee time for this round.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-round-course">Course</Label>
            <select
              id="edit-round-course"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="" disabled>
                Select a course
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.numberOfHoles}h)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-round-date">Date</Label>
              <Input
                id="edit-round-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-round-tee-time">Tee Time</Label>
              <Input
                id="edit-round-tee-time"
                type="time"
                value={teeTime}
                onChange={(e) => setTeeTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !courseId}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Edit Round Handicap Override Dialog
// ──────────────────────────────────────────────

function EditRoundHandicapDialog({
  roundParticipant,
  onSaved,
}: {
  roundParticipant: {
    id: string;
    handicapOverride: string | null;
    handicapSnapshot: string;
  };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    roundParticipant.handicapOverride ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const hc = value ? parseFloat(value) : null;
      await updateRoundParticipantFn({
        data: { roundParticipantId: roundParticipant.id, handicapOverride: hc },
      });
      toast.success('Handicap override updated.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update handicap',
      );
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Set Handicap Override
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Round Handicap Override</DialogTitle>
          <DialogDescription>
            Override the handicap for this round only. Snapshot from
            tournament: {roundParticipant.handicapSnapshot}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="number"
          step="0.1"
          placeholder={`Snapshot: ${roundParticipant.handicapSnapshot}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Competitions Section
// ──────────────────────────────────────────────

type RoundData = Awaited<ReturnType<typeof getRoundFn>>;
type ScorecardData = Awaited<ReturnType<typeof getScorecardFn>>;
type CompetitionsData = Awaited<ReturnType<typeof getRoundCompetitionsFn>>;

function CompetitionsSection({
  round,
  scorecard,
  competitions,
  isCommissioner,
  onChanged,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: CompetitionsData;
  isCommissioner: boolean;
  onChanged: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build engine inputs once
  const engineInputs = useMemo(() => {
    const holes: HoleData[] = round.course.holes.map((h) => ({
      holeNumber: h.holeNumber,
      par: h.par,
      strokeIndex: h.strokeIndex,
    }));

    const participants: ParticipantData[] = round.participants.map((rp) => {
      const effectiveHC = resolveEffectiveHandicap({
        handicapOverride: rp.handicapOverride,
        handicapSnapshot: rp.handicapSnapshot,
        tournamentParticipant: rp.tournamentParticipant
          ? { handicapOverride: rp.tournamentParticipant.handicapOverride }
          : null,
      });
      return {
        roundParticipantId: rp.id,
        personId: rp.person.id,
        displayName: rp.person.displayName,
        effectiveHandicap: effectiveHC,
        playingHandicap: getPlayingHandicap(effectiveHC),
        roundGroupId: rp.roundGroupId ?? null,
      };
    });

    // Convert scorecard record into flat ResolvedScore[]
    const scores: ResolvedScore[] = [];
    for (const [rpId, holeScores] of Object.entries(scorecard)) {
      for (const [holeStr, data] of Object.entries(holeScores)) {
        scores.push({
          roundParticipantId: rpId,
          holeNumber: parseInt(holeStr),
          strokes: data.strokes,
        });
      }
    }

    return { holes, participants, scores };
  }, [round, scorecard]);

  const handleDelete = async (compId: string) => {
    setDeletingId(compId);
    try {
      await deleteCompetitionFn({ data: { competitionId: compId } });
      toast.success('Competition deleted.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete competition',
      );
    }
    setDeletingId(null);
  };

  // Separate bonus comps from scored comps
  const scoredComps = competitions.filter(
    (c) => !isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );
  const bonusComps = competitions.filter(
    (c) => isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );

  return (
    <div className="space-y-4">
      {/* Scored competitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Competitions</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {competitions.length}
              </Badge>
              {isCommissioner && (
                <AddCompetitionDialog
                  tournamentId={round.tournamentId}
                  roundId={round.id}
                  participants={round.participants}
                  onSaved={onChanged}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No competitions set up for this round.
              {isCommissioner && ' Click + to add one.'}
            </p>
          ) : (
            <div className="space-y-6">
              {/* Scored competitions with leaderboards */}
              {scoredComps.map((comp) => {
                // Build competition config for the engine
                const config: CompetitionConfig = {
                  formatType: comp.formatType as CompetitionConfig['formatType'],
                  config: (comp.configJson ?? {}) as Record<string, any>,
                } as CompetitionConfig;

                let result;
                try {
                  const input: CompetitionInput = {
                    competition: {
                      id: comp.id,
                      name: comp.name,
                      config,
                      groupScope: (comp.groupScope ?? 'all') as 'all' | 'within_group',
                    },
                    ...engineInputs,
                  };
                  result = calculateCompetitionResults(input);
                } catch {
                  result = null;
                }

                return (
                  <div key={comp.id}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{comp.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {FORMAT_TYPE_LABELS[comp.formatType as CompetitionConfig['formatType']] ?? comp.formatType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {comp.participantType === 'team' ? 'Team' : 'Individual'}
                        </Badge>
                      </div>
                      {isCommissioner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          disabled={deletingId === comp.id}
                          onClick={() => handleDelete(comp.id)}
                        >
                          {deletingId === comp.id ? '…' : '✕'}
                        </Button>
                      )}
                    </div>
                    {result ? (
                      <CompetitionResults result={result} />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Unable to calculate results.
                      </p>
                    )}
                    <Separator className="mt-4" />
                  </div>
                );
              })}

              {/* Bonus competitions */}
              {bonusComps.length > 0 && (
                <div>
                  <h3 className="mb-3 font-medium">Bonus Prizes</h3>
                  <div className="space-y-2">
                    {bonusComps.map((comp) => {
                      const config = comp.configJson as { holeNumber?: number } | null;
                      const holeNumber = config?.holeNumber ?? 0;
                      const award = comp.bonusAwards?.[0];

                      return (
                        <BonusCompRow
                          key={comp.id}
                          comp={comp}
                          holeNumber={holeNumber}
                          award={award}
                          participants={round.participants}
                          isCommissioner={isCommissioner}
                          roundStatus={round.status}
                          onChanged={onChanged}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Bonus Comp Row (NTP / LD with award dropdown)
// ──────────────────────────────────────────────

function BonusCompRow({
  comp,
  holeNumber,
  award,
  participants,
  isCommissioner,
  roundStatus,
  onChanged,
}: {
  comp: CompetitionsData[number];
  holeNumber: number;
  award: CompetitionsData[number]['bonusAwards'][number] | undefined;
  participants: RoundData['participants'];
  isCommissioner: boolean;
  roundStatus: string;
  onChanged: () => void;
}) {
  const [awarding, setAwarding] = useState(false);

  const handleAward = async (roundParticipantId: string) => {
    setAwarding(true);
    try {
      await awardBonusFn({
        data: {
          competitionId: comp.id,
          roundParticipantId,
        },
      });
      toast.success('Award saved.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save award',
      );
    }
    setAwarding(false);
  };

  const handleRemoveAward = async () => {
    setAwarding(true);
    try {
      await removeBonusAwardFn({ data: { competitionId: comp.id } });
      toast.success('Award removed.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove award',
      );
    }
    setAwarding(false);
  };

  const typeLabel =
    comp.formatType === 'nearest_pin' ? 'NTP' : 'LD';
  const config = comp.configJson as { holeNumber?: number; bonusMode?: string; bonusPoints?: number } | null;
  const isContributor = config?.bonusMode === 'contributor';
  const canEdit = roundStatus === 'open' || roundStatus === 'locked';

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {typeLabel}
        </Badge>
        {isContributor && (
          <Badge variant="secondary" className="text-xs">
            +{config?.bonusPoints ?? 1} pts
          </Badge>
        )}
        <span className="text-sm">
          {comp.name}{' '}
          <span className="text-muted-foreground">
            (Hole {holeNumber})
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {award ? (
          <>
            <Badge variant="default">
              🏆 {award.roundParticipant?.person?.displayName ?? 'Unknown'}
            </Badge>
            {isCommissioner && canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive"
                disabled={awarding}
                onClick={handleRemoveAward}
              >
                ✕
              </Button>
            )}
          </>
        ) : canEdit ? (
          <select
            className="border-input bg-background h-8 rounded-md border px-2 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) handleAward(e.target.value);
            }}
            disabled={awarding}
          >
            <option value="">Award to…</option>
            {participants.map((rp) => (
              <option key={rp.id} value={rp.id}>
                {rp.person.displayName}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Add Competition Dialog
// ──────────────────────────────────────────────

function AddCompetitionDialog({
  tournamentId,
  roundId,
  participants: _participants,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  participants: RoundData['participants'];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('stableford');
  const [participantType, setParticipantType] = useState<'individual' | 'team'>('individual');

  // Format-specific config state
  const [countBack, setCountBack] = useState(true);
  const [scoringBasis, setScoringBasis] = useState<'net_strokes' | 'gross_strokes'>('net_strokes');
  const [holeNumber, setHoleNumber] = useState(1);
  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>('standalone');
  const [bonusPoints, setBonusPoints] = useState(1);

  const resetForm = () => {
    setName('');
    setFormatType('stableford');
    setParticipantType('individual');
    setCountBack(true);
    setScoringBasis('net_strokes');
    setHoleNumber(1);
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
    setBonusMode('standalone');
    setBonusPoints(1);
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'stableford':
        return { formatType: 'stableford', config: { countBack } };
      case 'stroke_play':
        return { formatType: 'stroke_play', config: { scoringBasis } };
      case 'match_play':
        return {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
      case 'best_ball':
        return {
          formatType: 'best_ball',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
      case 'nearest_pin':
        return { formatType: 'nearest_pin', config: { holeNumber, bonusMode, bonusPoints } };
      case 'longest_drive':
        return { formatType: 'longest_drive', config: { holeNumber, bonusMode, bonusPoints } };
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Competition name is required.');
      return;
    }
    setSaving(true);
    try {
      await createCompetitionFn({
        data: {
          tournamentId,
          name: name.trim(),
          participantType,
          groupScope: 'all',
          roundId,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Competition created.');
      setOpen(false);
      resetForm();
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create competition',
      );
    }
    setSaving(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          + Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Competition</DialogTitle>
          <DialogDescription>
            Create a new competition for this round.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="comp-name">Name</Label>
            <Input
              id="comp-name"
              placeholder="e.g. Day 1 Stableford"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label htmlFor="comp-format">Format</Label>
            <select
              id="comp-format"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {FORMAT_TYPES.map((ft) => (
                <option key={ft} value={ft}>
                  {FORMAT_TYPE_LABELS[ft]}
                </option>
              ))}
            </select>
          </div>

          {/* Participant Type */}
          <div className="space-y-2">
            <Label htmlFor="comp-participant-type">Participant Type</Label>
            <select
              id="comp-participant-type"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={participantType}
              onChange={(e) =>
                setParticipantType(e.target.value as 'individual' | 'team')
              }
            >
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>

          {/* Format-specific config */}
          {formatType === 'stableford' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="comp-countback"
                checked={countBack}
                onChange={(e) => setCountBack(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="comp-countback">
                Count-back tiebreaker
              </Label>
            </div>
          )}

          {formatType === 'stroke_play' && (
            <div className="space-y-2">
              <Label>Scoring Basis</Label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={scoringBasis}
                onChange={(e) =>
                  setScoringBasis(e.target.value as 'net_strokes' | 'gross_strokes')
                }
              >
                <option value="net_strokes">Net Strokes</option>
                <option value="gross_strokes">Gross Strokes</option>
              </select>
            </div>
          )}

          {(formatType === 'match_play' || formatType === 'best_ball') && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Points per Win</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerWin}
                    onChange={(e) =>
                      setPointsPerWin(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points per Half</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerHalf}
                    onChange={(e) =>
                      setPointsPerHalf(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Pairings can be configured after creation.
              </p>
            </div>
          )}

          {(formatType === 'nearest_pin' || formatType === 'longest_drive') && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Hole Number</Label>
                <Input
                  type="number"
                  min={1}
                  max={18}
                  value={holeNumber}
                  onChange={(e) =>
                    setHoleNumber(parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus Mode</Label>
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={bonusMode}
                  onChange={(e) =>
                    setBonusMode(e.target.value as 'standalone' | 'contributor')
                  }
                >
                  <option value="standalone">Standalone (award only)</option>
                  <option value="contributor">Contributor (adds to individual standings)</option>
                </select>
              </div>
              {bonusMode === 'contributor' && (
                <div className="space-y-2">
                  <Label>Bonus Points</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={bonusPoints}
                    onChange={(e) =>
                      setBonusPoints(parseFloat(e.target.value) || 1)
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Points added to the winner's individual tournament standing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
