import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  getRoundFn,
  deleteRoundFn,
  transitionRoundFn,
  removeRoundParticipantFn,
  updateRoundParticipantFn,
  updateRoundFn,
  addRoundParticipantFn,
} from '@/lib/rounds.server';
import {
  getTournamentFn,
  deleteTournamentFn,
  searchPersonsFn,
  addParticipantFn,
  removeParticipantFn,
  createGuestPersonFn,
  ensureMyPersonFn,
  getMyPersonFn,
} from '@/lib/tournaments.server';
import {
  createTeamFn,
  deleteTeamFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
import { getCoursesFn } from '@/lib/courses.server';
import { getScorecardFn } from '@/lib/scores.server';
import {
  getRoundCompetitionsFn,
  createCompetitionFn,
  updateCompetitionFn,
  deleteCompetitionFn,
  awardBonusFn,
  removeBonusAwardFn,
} from '@/lib/competitions.server';
import {
  createRoundGroupFn,
  deleteRoundGroupFn,
  assignParticipantToGroupFn,
  autoAssignGroupsFn,
} from '@/lib/groups.server';
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
import { Switch } from '@/components/ui/switch';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@tanstack/react-router';
import {
  FORMAT_TYPE_LABELS,
  isBonusFormat,
  isMatchFormat,
} from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import {
  calculateCompetitionResults,
  type CompetitionInput,
  type HoleData,
  type ParticipantData,
  type ResolvedScore,
} from '@/lib/domain';
import { resolveEffectiveHandicap, getPlayingHandicap } from '@/lib/handicaps';

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

    // For single rounds, also load the full tournament data for Players/Teams panels
    let tournament = null;
    let myPerson = null;
    if (round.tournament?.isSingleRound) {
      [tournament, myPerson] = await Promise.all([
        getTournamentFn({ data: { tournamentId: round.tournamentId } }),
        getMyPersonFn(),
      ]);
    }

    return { round, courses, scorecard, competitions, tournament, myPerson };
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
  const { round, courses, scorecard, competitions, tournament, myPerson } =
    Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = useAuth();
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
      rp.person.userId === user.id &&
      rp.tournamentParticipant?.role === 'commissioner',
  );

  // Determine the recording role for the current user
  const getRecordingRole = (
    roundParticipantId: string,
  ): 'player' | 'marker' | 'commissioner' => {
    const rp = round.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === user.id) return 'player';
    return 'marker';
  };

  const tournamentId = round.tournamentId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isSingleRound) {
        // Delete the whole auto-tournament for single rounds
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
          userId={user.id}
          myPerson={myPerson}
          onChanged={() => router.invalidate()}
        />
      )}

      {/* Players & Groups — hidden for single rounds (handled by SingleRoundPlayersSection above) */}
      {!isSingleRound && (
        <PlayersAndGroupsSection
          round={round}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
        />
      )}

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
  courses: {
    id: string;
    name: string;
    location: string | null;
    numberOfHoles: number;
  }[];
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
  const [value, setValue] = useState(roundParticipant.handicapOverride ?? '');
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
            Override the handicap for this round only. Snapshot from tournament:{' '}
            {roundParticipant.handicapSnapshot}
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
// Players & Groups Section
// ──────────────────────────────────────────────

type RoundData = Awaited<ReturnType<typeof getRoundFn>>;

function PlayersAndGroupsSection({
  round,
  isCommissioner,
  onChanged,
}: {
  round: RoundData;
  isCommissioner: boolean;
  onChanged: () => void;
}) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignSize, setAutoAssignSize] = useState(4);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const isDraft = round.status === 'draft';
  const canEditGroups = isCommissioner && isDraft;
  const showGroups = round.participants.length > 4;

  // Separate participants into grouped and ungrouped
  const ungrouped = round.participants.filter((rp) => !rp.roundGroupId);
  const groups = round.groups ?? [];

  // Build a lookup from roundGroupId to participants (use round.participants for full data)
  const groupParticipantsMap = useMemo(() => {
    const map = new Map<string, RoundData['participants']>();
    for (const g of groups) {
      map.set(
        g.id,
        round.participants.filter((rp) => rp.roundGroupId === g.id),
      );
    }
    return map;
  }, [groups, round.participants]);

  const handleAssignToGroup = async (
    roundParticipantId: string,
    roundGroupId: string | null,
  ) => {
    setAssigning(roundParticipantId);
    try {
      await assignParticipantToGroupFn({
        data: { roundParticipantId, roundGroupId },
      });
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to assign player',
      );
    }
    setAssigning(null);
  };

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      await autoAssignGroupsFn({
        data: { roundId: round.id, groupSize: autoAssignSize },
      });
      toast.success('Players assigned to groups.');
      setAutoAssignOpen(false);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to auto-assign',
      );
    }
    setAutoAssigning(false);
  };

  const handleAddGroup = async () => {
    setAddingGroup(true);
    try {
      const nextNumber =
        groups.length > 0
          ? Math.max(...groups.map((g) => g.groupNumber)) + 1
          : 1;
      await createRoundGroupFn({
        data: {
          roundId: round.id,
          groupNumber: nextNumber,
          name: `Group ${nextNumber}`,
        },
      });
      toast.success('Group added.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add group',
      );
    }
    setAddingGroup(false);
  };

  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroupId(groupId);
    try {
      await deleteRoundGroupFn({ data: { roundGroupId: groupId } });
      toast.success('Group deleted.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete group',
      );
    }
    setDeletingGroupId(null);
  };

  const handleRemoveParticipant = async (rpId: string, name: string) => {
    try {
      await removeRoundParticipantFn({ data: { roundParticipantId: rpId } });
      toast.success(`${name} removed from round.`);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove participant',
      );
    }
  };

  // Shared player row component
  const PlayerRow = ({
    rp,
    showGroupAssign = true,
  }: {
    rp: RoundData['participants'][number];
    showGroupAssign?: boolean;
  }) => (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{rp.person.displayName}</span>
        {rp.person.userId == null && (
          <Badge variant="outline" className="text-xs">
            Guest
          </Badge>
        )}
        {rp.tournamentParticipant?.teamMemberships?.[0]?.team && (
          <Badge variant="secondary" className="text-xs">
            {rp.tournamentParticipant.teamMemberships[0].team.name}
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
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                ⋯
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <EditRoundHandicapDialog
                roundParticipant={rp}
                onSaved={onChanged}
              />
              {showGroupAssign &&
                canEditGroups &&
                showGroups &&
                groups.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {/* Move to another group or unassign */}
                    {groups
                      .filter((g) => g.id !== rp.roundGroupId)
                      .map((g) => (
                        <DropdownMenuItem
                          key={g.id}
                          disabled={assigning === rp.id}
                          onClick={() => handleAssignToGroup(rp.id, g.id)}
                        >
                          Move to {g.name || `Group ${g.groupNumber}`}
                        </DropdownMenuItem>
                      ))}
                    {rp.roundGroupId && (
                      <DropdownMenuItem
                        disabled={assigning === rp.id}
                        onClick={() => handleAssignToGroup(rp.id, null)}
                      >
                        Unassign from Group
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  handleRemoveParticipant(rp.id, rp.person.displayName)
                }
              >
                Remove from Round
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{showGroups ? 'Players & Groups' : 'Players'}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {round.participants.length} player
              {round.participants.length !== 1 ? 's' : ''}
            </Badge>
            {canEditGroups && showGroups && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoAssignOpen(true)}
                  disabled={round.participants.length === 0}
                >
                  Auto-assign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddGroup}
                  disabled={addingGroup}
                >
                  {addingGroup ? '…' : '+ Group'}
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {round.participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No players in this round.
          </p>
        ) : !showGroups || groups.length === 0 ? (
          /* Under 5 players or no groups — show flat list */
          <div className="space-y-2">
            {round.participants.map((rp) => (
              <PlayerRow key={rp.id} rp={rp} showGroupAssign={false} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Groups */}
            {groups.map((group) => {
              const members = groupParticipantsMap.get(group.id) ?? [];
              return (
                <div key={group.id} className="rounded-lg border">
                  <div className="bg-muted/50 flex items-center justify-between rounded-t-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {group.name || `Group ${group.groupNumber}`}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {members.length}
                      </Badge>
                    </div>
                    {canEditGroups && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-7 text-xs"
                        disabled={deletingGroupId === group.id}
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        {deletingGroupId === group.id ? '…' : 'Delete'}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 p-2">
                    {members.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-1 text-sm">
                        No players assigned.
                      </p>
                    ) : (
                      members.map((rp) => <PlayerRow key={rp.id} rp={rp} />)
                    )}
                  </div>
                </div>
              );
            })}

            {/* Ungrouped players */}
            {ungrouped.length > 0 && (
              <div className="rounded-lg border border-dashed">
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-muted-foreground text-sm font-semibold">
                    Unassigned
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {ungrouped.length}
                  </Badge>
                </div>
                <div className="space-y-1 p-2">
                  {ungrouped.map((rp) => (
                    <PlayerRow key={rp.id} rp={rp} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Auto-assign dialog */}
      <Dialog open={autoAssignOpen} onOpenChange={setAutoAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Auto-assign Groups</DialogTitle>
            <DialogDescription>
              Automatically distribute {round.participants.length} player
              {round.participants.length !== 1 ? 's' : ''} into groups. Existing
              groups will be replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="auto-group-size">Players per group</Label>
            <Input
              id="auto-group-size"
              type="number"
              min={1}
              max={4}
              value={autoAssignSize}
              onChange={(e) =>
                setAutoAssignSize(
                  Math.max(1, Math.min(4, parseInt(e.target.value) || 4)),
                )
              }
            />
            <p className="text-muted-foreground text-xs">
              Creates {Math.ceil(round.participants.length / autoAssignSize)}{' '}
              group
              {Math.ceil(round.participants.length / autoAssignSize) !== 1
                ? 's'
                : ''}
              .
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAutoAssign} disabled={autoAssigning}>
              {autoAssigning ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Competitions Section
// ──────────────────────────────────────────────
type ScorecardData = Awaited<ReturnType<typeof getScorecardFn>>;
type CompetitionsData = Awaited<ReturnType<typeof getRoundCompetitionsFn>>;

function CompetitionsSection({
  round,
  scorecard,
  competitions,
  isCommissioner,
  hasTeams,
  onChanged,
}: {
  round: RoundData;
  scorecard: ScorecardData;
  competitions: CompetitionsData;
  isCommissioner: boolean;
  hasTeams: boolean;
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
  const bonusComps = competitions.filter((c) =>
    isBonusFormat(c.formatType as CompetitionConfig['formatType']),
  );

  return (
    <div className="space-y-4">
      {/* Scored competitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Competitions</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{competitions.length}</Badge>
              {isCommissioner && (
                <>
                  <AddIndividualCompDialog
                    tournamentId={round.tournamentId}
                    roundId={round.id}
                    onSaved={onChanged}
                  />
                  {hasTeams && (
                    <AddTeamCompDialog
                      tournamentId={round.tournamentId}
                      roundId={round.id}
                      onSaved={onChanged}
                    />
                  )}
                  <AddBonusCompDialog
                    tournamentId={round.tournamentId}
                    roundId={round.id}
                    onSaved={onChanged}
                  />
                </>
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
                  formatType:
                    comp.formatType as CompetitionConfig['formatType'],
                  config: (comp.configJson ?? {}) as Record<string, any>,
                } as CompetitionConfig;

                let result;
                try {
                  const input: CompetitionInput = {
                    competition: {
                      id: comp.id,
                      name: comp.name,
                      config,
                      groupScope: (comp.groupScope ?? 'all') as
                        | 'all'
                        | 'within_group',
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
                          {FORMAT_TYPE_LABELS[
                            comp.formatType as CompetitionConfig['formatType']
                          ] ?? comp.formatType}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {comp.participantType === 'team'
                            ? 'Team'
                            : 'Individual'}
                        </Badge>
                      </div>
                      {isCommissioner && (
                        <div className="flex items-center gap-1">
                          <EditCompetitionDialog
                            comp={comp}
                            hasGroups={round.groups.length > 0}
                            onSaved={onChanged}
                          />
                          {isMatchFormat(
                            comp.formatType as CompetitionConfig['formatType'],
                          ) && (
                            <ConfigureMatchesDialog
                              comp={comp}
                              participants={round.participants}
                              groups={round.groups}
                              onSaved={onChanged}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7"
                            disabled={deletingId === comp.id}
                            onClick={() => handleDelete(comp.id)}
                          >
                            {deletingId === comp.id ? '…' : '✕'}
                          </Button>
                        </div>
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
                      const config = comp.configJson as {
                        holeNumber?: number;
                      } | null;
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
                          hasGroups={round.groups.length > 0}
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
  hasGroups,
  onChanged,
}: {
  comp: CompetitionsData[number];
  holeNumber: number;
  award: CompetitionsData[number]['bonusAwards'][number] | undefined;
  participants: RoundData['participants'];
  isCommissioner: boolean;
  roundStatus: string;
  hasGroups: boolean;
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

  const typeLabel = comp.formatType === 'nearest_pin' ? 'NTP' : 'LD';
  const config = comp.configJson as {
    holeNumber?: number;
    bonusMode?: string;
    bonusPoints?: number;
  } | null;
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
          <span className="text-muted-foreground">(Hole {holeNumber})</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isCommissioner && (
          <EditCompetitionDialog
            comp={comp}
            hasGroups={hasGroups}
            onSaved={onChanged}
          />
        )}
        {award ? (
          <>
            <Badge variant="default">
              🏆 {award.roundParticipant?.person?.displayName ?? 'Unknown'}
            </Badge>
            {isCommissioner && canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-6 text-xs"
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
// Configure Matches Dialog (match play pairings)
// Pairings are scoped within each group.
// ──────────────────────────────────────────────

function ConfigureMatchesDialog({
  comp,
  participants,
  groups,
  onSaved,
}: {
  comp: CompetitionsData[number];
  participants: RoundData['participants'];
  groups: RoundData['groups'];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Parse existing pairings from config
  const existingConfig = comp.configJson as Record<string, any> | null;
  const existingPairings: { playerA: string; playerB: string }[] =
    existingConfig?.pairings ?? [];

  const [pairings, setPairings] = useState(existingPairings);

  // Per-group "add pairing" state
  const [addState, setAddState] = useState<
    Record<string, { playerA: string; playerB: string }>
  >({});

  const getAddState = (groupId: string) =>
    addState[groupId] ?? { playerA: '', playerB: '' };

  const setGroupPlayerA = (groupId: string, value: string) =>
    setAddState((prev) => ({
      ...prev,
      [groupId]: { ...getAddState(groupId), playerA: value },
    }));

  const setGroupPlayerB = (groupId: string, value: string) =>
    setAddState((prev) => ({
      ...prev,
      [groupId]: { ...getAddState(groupId), playerB: value },
    }));

  // Players already assigned to a pairing
  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of pairings) {
      ids.add(p.playerA);
      ids.add(p.playerB);
    }
    return ids;
  }, [pairings]);

  const getPlayerName = (rpId: string) =>
    participants.find((rp) => rp.id === rpId)?.person.displayName ?? 'Unknown';

  const getPlayerTeam = (rpId: string) => {
    const rp = participants.find((p) => p.id === rpId);
    return rp?.tournamentParticipant?.teamMemberships?.[0]?.team?.name ?? null;
  };

  const getPlayerTeamId = (rpId: string) => {
    const rp = participants.find((p) => p.id === rpId);
    return rp?.tournamentParticipant?.teamMemberships?.[0]?.team?.id ?? null;
  };

  // Get pairings that belong to a specific group
  const getPairingsForGroup = (groupId: string) => {
    const groupMemberIds = new Set(
      participants
        .filter((rp) => rp.roundGroupId === groupId)
        .map((rp) => rp.id),
    );
    return pairings
      .map((p, i) => ({ ...p, index: i }))
      .filter(
        (p) => groupMemberIds.has(p.playerA) || groupMemberIds.has(p.playerB),
      );
  };

  // Get available (unpaired) players within a group
  const getAvailableInGroup = (groupId: string) =>
    participants.filter(
      (rp) => rp.roundGroupId === groupId && !assignedIds.has(rp.id),
    );

  const handleAddPairing = (groupId: string) => {
    const { playerA, playerB } = getAddState(groupId);
    if (!playerA || !playerB || playerA === playerB) return;
    setPairings((prev) => [...prev, { playerA, playerB }]);
    setAddState((prev) => ({
      ...prev,
      [groupId]: { playerA: '', playerB: '' },
    }));
  };

  const handleRemovePairing = (index: number) => {
    setPairings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config: CompetitionConfig = {
        formatType: comp.formatType as CompetitionConfig['formatType'],
        config: {
          ...existingConfig,
          pairings,
        },
      } as CompetitionConfig;

      await updateCompetitionFn({
        data: {
          id: comp.id,
          competitionConfig: config,
        },
      });
      toast.success('Matches configured.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save matches',
      );
    }
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPairings(existingPairings);
      setAddState({});
    }
    setOpen(next);
  };

  const hasGroups = groups.length > 0;

  // For ungrouped players (when groups exist but some players aren't assigned)
  const ungroupedPlayers = participants.filter(
    (rp) => !rp.roundGroupId && !assignedIds.has(rp.id),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          Configure Matches
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Matches</DialogTitle>
          <DialogDescription>
            Set up head-to-head pairings for {comp.name}.
            {hasGroups
              ? ' Pairings are organised by group.'
              : ' Create groups first to organise pairings.'}
          </DialogDescription>
        </DialogHeader>

        {!hasGroups ? (
          <p className="text-muted-foreground py-2 text-sm">
            No groups have been created. Set up groups in the Players &amp;
            Groups section above, then come back to configure matches.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => {
              const groupPairings = getPairingsForGroup(group.id);
              const available = getAvailableInGroup(group.id);
              const { playerA, playerB } = getAddState(group.id);

              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {group.name || `Group ${group.groupNumber}`}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {
                        participants.filter(
                          (rp) => rp.roundGroupId === group.id,
                        ).length
                      }{' '}
                      players
                    </Badge>
                  </div>

                  {/* Existing pairings in this group */}
                  {groupPairings.length > 0 && (
                    <div className="space-y-1">
                      {groupPairings.map((pairing) => {
                        const teamA = getPlayerTeam(pairing.playerA);
                        const teamB = getPlayerTeam(pairing.playerB);
                        return (
                          <div
                            key={pairing.index}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                {getPlayerName(pairing.playerA)}
                              </span>
                              {teamA && (
                                <Badge variant="secondary" className="text-xs">
                                  {teamA}
                                </Badge>
                              )}
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium">
                                {getPlayerName(pairing.playerB)}
                              </span>
                              {teamB && (
                                <Badge variant="secondary" className="text-xs">
                                  {teamB}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-6 text-xs"
                              onClick={() => handleRemovePairing(pairing.index)}
                            >
                              ✕
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add pairing within this group */}
                  {available.length >= 2 ? (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <select
                          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          value={playerA}
                          onChange={(e) =>
                            setGroupPlayerA(group.id, e.target.value)
                          }
                        >
                          <option value="" disabled>
                            Player A
                          </option>
                          {available
                            .filter((rp) => {
                              if (rp.id === playerB) return false;
                              // If Player B is selected, hide same-team players
                              if (playerB) {
                                const selectedTeamId = getPlayerTeamId(playerB);
                                const rpTeamId =
                                  rp.tournamentParticipant?.teamMemberships?.[0]
                                    ?.team?.id ?? null;
                                if (
                                  selectedTeamId &&
                                  rpTeamId &&
                                  selectedTeamId === rpTeamId
                                )
                                  return false;
                              }
                              return true;
                            })
                            .map((rp) => {
                              const team =
                                rp.tournamentParticipant?.teamMemberships?.[0]
                                  ?.team?.name;
                              return (
                                <option key={rp.id} value={rp.id}>
                                  {rp.person.displayName}
                                  {team ? ` (${team})` : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <span className="text-muted-foreground pb-2 text-sm">
                        vs
                      </span>
                      <div className="flex-1">
                        <select
                          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          value={playerB}
                          onChange={(e) =>
                            setGroupPlayerB(group.id, e.target.value)
                          }
                        >
                          <option value="" disabled>
                            Player B
                          </option>
                          {available
                            .filter((rp) => {
                              if (rp.id === playerA) return false;
                              // If Player A is selected, hide same-team players
                              if (playerA) {
                                const selectedTeamId = getPlayerTeamId(playerA);
                                const rpTeamId =
                                  rp.tournamentParticipant?.teamMemberships?.[0]
                                    ?.team?.id ?? null;
                                if (
                                  selectedTeamId &&
                                  rpTeamId &&
                                  selectedTeamId === rpTeamId
                                )
                                  return false;
                              }
                              return true;
                            })
                            .map((rp) => {
                              const team =
                                rp.tournamentParticipant?.teamMemberships?.[0]
                                  ?.team?.name;
                              return (
                                <option key={rp.id} value={rp.id}>
                                  {rp.person.displayName}
                                  {team ? ` (${team})` : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={!playerA || !playerB || playerA === playerB}
                        onClick={() => handleAddPairing(group.id)}
                      >
                        Add
                      </Button>
                    </div>
                  ) : groupPairings.length > 0 && available.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      All players in this group are paired.
                    </p>
                  ) : available.length === 1 ? (
                    <p className="text-muted-foreground text-xs">
                      1 player remaining without a match.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No players in this group.
                    </p>
                  )}

                  <Separator />
                </div>
              );
            })}

            {ungroupedPlayers.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {ungroupedPlayers.length} player
                {ungroupedPlayers.length !== 1 ? 's' : ''} not assigned to a
                group. Assign them to a group to configure matches.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasGroups}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Edit Competition Dialog
// ──────────────────────────────────────────────

function EditCompetitionDialog({
  comp,
  hasGroups,
  onSaved,
}: {
  comp: CompetitionsData[number];
  hasGroups: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatType = comp.formatType as CompetitionConfig['formatType'];
  const existingConfig = (comp.configJson ?? {}) as Record<string, any>;
  const isBonus = isBonusFormat(formatType);

  // Form state — initialised from existing comp
  const [name, setName] = useState(comp.name);
  const [groupScope, setGroupScope] = useState<'all' | 'within_group'>(
    (comp.groupScope as 'all' | 'within_group') ?? 'all',
  );
  const [countBack, setCountBack] = useState<boolean>(
    existingConfig.countBack ?? true,
  );
  const [scoringBasis, setScoringBasis] = useState<
    'net_strokes' | 'gross_strokes'
  >(existingConfig.scoringBasis ?? 'net_strokes');
  const [pointsPerWin, setPointsPerWin] = useState<number>(
    existingConfig.pointsPerWin ?? 1,
  );
  const [pointsPerHalf, setPointsPerHalf] = useState<number>(
    existingConfig.pointsPerHalf ?? 0.5,
  );
  const [holeNumber, setHoleNumber] = useState<number>(
    existingConfig.holeNumber ?? 1,
  );
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>(
    existingConfig.bonusMode ?? 'standalone',
  );
  const [bonusPoints, setBonusPoints] = useState<number>(
    existingConfig.bonusPoints ?? 1,
  );

  const resetForm = () => {
    setName(comp.name);
    setGroupScope((comp.groupScope as 'all' | 'within_group') ?? 'all');
    setCountBack(existingConfig.countBack ?? true);
    setScoringBasis(existingConfig.scoringBasis ?? 'net_strokes');
    setPointsPerWin(existingConfig.pointsPerWin ?? 1);
    setPointsPerHalf(existingConfig.pointsPerHalf ?? 0.5);
    setHoleNumber(existingConfig.holeNumber ?? 1);
    setBonusMode(existingConfig.bonusMode ?? 'standalone');
    setBonusPoints(existingConfig.bonusPoints ?? 1);
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
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings: existingConfig.pairings ?? [],
          },
        };
      case 'best_ball':
        return {
          formatType: 'best_ball',
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings: existingConfig.pairings ?? [],
          },
        };
      case 'nearest_pin':
        return {
          formatType: 'nearest_pin',
          config: { holeNumber, bonusMode, bonusPoints },
        };
      case 'longest_drive':
        return {
          formatType: 'longest_drive',
          config: { holeNumber, bonusMode, bonusPoints },
        };
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Competition name is required.');
      return;
    }
    setSaving(true);
    try {
      await updateCompetitionFn({
        data: {
          id: comp.id,
          name: name.trim(),
          groupScope,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Competition updated.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update competition',
      );
    }
    setSaving(false);
  };

  const formatLabel = FORMAT_TYPE_LABELS[formatType] ?? formatType;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7">
          ✎
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Competition</DialogTitle>
          <DialogDescription>
            {formatLabel} ·{' '}
            {comp.participantType === 'team' ? 'Team' : 'Individual'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-comp-name">Name</Label>
            <Input
              id="edit-comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Group scope — only show when round has groups and comp is not bonus */}
          {hasGroups && !isBonus && (
            <div className="space-y-2">
              <Label>Scope</Label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={groupScope}
                onChange={(e) =>
                  setGroupScope(e.target.value as 'all' | 'within_group')
                }
              >
                <option value="all">All players</option>
                <option value="within_group">Within each group</option>
              </select>
            </div>
          )}

          {/* Stableford config */}
          {formatType === 'stableford' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-countback"
                checked={countBack}
                onChange={(e) => setCountBack(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-countback">Count-back tiebreaker</Label>
            </div>
          )}

          {/* Stroke play config */}
          {formatType === 'stroke_play' && (
            <div className="space-y-2">
              <Label>Scoring Basis</Label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={scoringBasis}
                onChange={(e) =>
                  setScoringBasis(
                    e.target.value as 'net_strokes' | 'gross_strokes',
                  )
                }
              >
                <option value="net_strokes">Net Strokes</option>
                <option value="gross_strokes">Gross Strokes</option>
              </select>
            </div>
          )}

          {/* Match play / best ball config */}
          {(formatType === 'match_play' || formatType === 'best_ball') && (
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
          )}

          {/* Bonus (NTP / LD) config */}
          {(formatType === 'nearest_pin' || formatType === 'longest_drive') && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Hole Number</Label>
                <Input
                  type="number"
                  min={1}
                  max={18}
                  value={holeNumber}
                  onChange={(e) => setHoleNumber(parseInt(e.target.value) || 1)}
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
                  <option value="contributor">
                    Contributor (adds to individual standings)
                  </option>
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
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Add Individual Competition Dialog
// ──────────────────────────────────────────────

const INDIVIDUAL_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'stableford', label: 'Stableford' },
  { value: 'stroke_play', label: 'Stroke Play' },
  { value: 'match_play', label: 'Match Play' },
];

const BONUS_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'nearest_pin', label: 'Nearest the Pin' },
  { value: 'longest_drive', label: 'Longest Drive' },
];

function AddIndividualCompDialog({
  tournamentId,
  roundId,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('stableford');

  // Format-specific config state
  const [countBack, setCountBack] = useState(true);
  const [scoringBasis, setScoringBasis] = useState<
    'net_strokes' | 'gross_strokes'
  >('net_strokes');
  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const resetForm = () => {
    setName('');
    setFormatType('stableford');
    setCountBack(true);
    setScoringBasis('net_strokes');
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
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
      default:
        return { formatType: 'stableford', config: { countBack } };
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
          participantType: 'individual',
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
          + Individual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Individual Competition</DialogTitle>
          <DialogDescription>
            Create a competition scored per player.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="indiv-comp-name">Name</Label>
            <Input
              id="indiv-comp-name"
              placeholder="e.g. Day 1 Stableford"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indiv-comp-format">Format</Label>
            <select
              id="indiv-comp-format"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {INDIVIDUAL_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </select>
          </div>

          {formatType === 'stableford' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="indiv-countback"
                checked={countBack}
                onChange={(e) => setCountBack(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="indiv-countback">Count-back tiebreaker</Label>
            </div>
          )}

          {formatType === 'stroke_play' && (
            <div className="space-y-2">
              <Label>Scoring Basis</Label>
              <select
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                value={scoringBasis}
                onChange={(e) =>
                  setScoringBasis(
                    e.target.value as 'net_strokes' | 'gross_strokes',
                  )
                }
              >
                <option value="net_strokes">Net Strokes</option>
                <option value="gross_strokes">Gross Strokes</option>
              </select>
            </div>
          )}

          {formatType === 'match_play' && (
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

// ──────────────────────────────────────────────
// Add Team Competition Dialog
// ──────────────────────────────────────────────

const TEAM_FORMATS: {
  value: CompetitionConfig['formatType'];
  label: string;
}[] = [
  { value: 'match_play', label: 'Match Play' },
  { value: 'best_ball', label: 'Best Ball' },
];

function AddTeamCompDialog({
  tournamentId,
  roundId,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('match_play');

  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const resetForm = () => {
    setName('');
    setFormatType('match_play');
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
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
      default:
        return {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
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
          participantType: 'team',
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
          + Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Competition</DialogTitle>
          <DialogDescription>
            Create a competition scored between teams.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-comp-name">Name</Label>
            <Input
              id="team-comp-name"
              placeholder="e.g. Day 1 Match Play"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-comp-format">Format</Label>
            <select
              id="team-comp-format"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {TEAM_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </select>
          </div>

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

// ──────────────────────────────────────────────
// Add Bonus Competition Dialog (NTP / LD)
// ──────────────────────────────────────────────

function AddBonusCompDialog({
  tournamentId,
  roundId,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('nearest_pin');
  const [holeNumber, setHoleNumber] = useState(1);
  const [bonusMode, setBonusMode] = useState<'standalone' | 'contributor'>(
    'standalone',
  );
  const [bonusPoints, setBonusPoints] = useState(1);

  const resetForm = () => {
    setName('');
    setFormatType('nearest_pin');
    setHoleNumber(1);
    setBonusMode('standalone');
    setBonusPoints(1);
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'nearest_pin':
        return {
          formatType: 'nearest_pin',
          config: { holeNumber, bonusMode, bonusPoints },
        };
      case 'longest_drive':
        return {
          formatType: 'longest_drive',
          config: { holeNumber, bonusMode, bonusPoints },
        };
      default:
        return {
          formatType: 'nearest_pin',
          config: { holeNumber, bonusMode, bonusPoints },
        };
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
          participantType: 'individual',
          groupScope: 'all',
          roundId,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Bonus competition created.');
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
          + Bonus
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bonus Prize</DialogTitle>
          <DialogDescription>
            Add a nearest-the-pin or longest-drive prize.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bonus-comp-name">Name</Label>
            <Input
              id="bonus-comp-name"
              placeholder="e.g. NTP Hole 7"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonus-comp-format">Type</Label>
            <select
              id="bonus-comp-format"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {BONUS_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Hole Number</Label>
            <Input
              type="number"
              min={1}
              max={18}
              value={holeNumber}
              onChange={(e) => setHoleNumber(parseInt(e.target.value) || 1)}
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
              <option value="contributor">
                Contributor (adds to individual standings)
              </option>
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

// ──────────────────────────────────────────────
// Single Round: Players Section
// ──────────────────────────────────────────────

type TournamentData = Awaited<ReturnType<typeof getTournamentFn>>;

function SingleRoundPlayersSection({
  tournament,
  roundId,
  isCommissioner,
  userId,
  myPerson,
  onChanged,
}: {
  tournament: TournamentData;
  roundId: string;
  isCommissioner: boolean;
  userId: string;
  myPerson: { id: string } | null;
  onChanged: () => void;
}) {
  const [showTeams, setShowTeams] = useState(tournament.teams.length > 0);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    teamId: string;
    name: string;
  } | null>(null);

  const iAmParticipant = myPerson
    ? tournament.participants.some((p) => p.personId === myPerson.id)
    : false;

  const assignedParticipantIds = new Set(
    tournament.teams.flatMap((t) => t.members.map((m) => m.participantId)),
  );
  const unassignedForTeams = tournament.participants.filter(
    (p) => !assignedParticipantIds.has(p.id) && p.role !== 'spectator',
  );

  const handleAddMyself = async () => {
    try {
      const person = myPerson ?? (await ensureMyPersonFn());
      const tp = await addParticipantFn({
        data: {
          tournamentId: tournament.id,
          personId: person.id,
          role: 'player',
        },
      });
      await addRoundParticipantFn({
        data: {
          roundId,
          personId: person.id,
          tournamentParticipantId: tp.participantId,
          handicapSnapshot: '0',
        },
      });
      toast.success('You joined the round!');
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join');
    }
  };

  const handleRemoveParticipant = async (
    participantId: string,
    name: string,
  ) => {
    try {
      await removeParticipantFn({ data: { participantId } });
      toast.success(`${name} removed.`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove');
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      await createTeamFn({
        data: { tournamentId: tournament.id, name: newTeamName.trim() },
      });
      toast.success('Team created!');
      setNewTeamName('');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create team',
      );
    }
    setCreatingTeam(false);
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeamFn({ data: { teamId } });
      toast.success('Team deleted.');
      setDeleteConfirm(null);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete team',
      );
    }
  };

  const handleAddTeamMember = async (teamId: string, participantId: string) => {
    try {
      await addTeamMemberFn({ data: { teamId, participantId } });
      toast.success('Player added to team.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add to team',
      );
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      await removeTeamMemberFn({ data: { memberId } });
      toast.success('Player removed from team.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove from team',
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Players</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="teams-toggle"
                  checked={showTeams}
                  onCheckedChange={setShowTeams}
                  className="scale-75"
                />
                <Label
                  htmlFor="teams-toggle"
                  className="text-muted-foreground cursor-pointer text-xs font-normal"
                >
                  Teams
                </Label>
              </div>
              <Badge variant="secondary">
                {tournament.participants.length} player
                {tournament.participants.length !== 1 ? 's' : ''}
              </Badge>
              {!iAmParticipant && (
                <Button size="sm" variant="outline" onClick={handleAddMyself}>
                  Join
                </Button>
              )}
              {isCommissioner && (
                <SingleRoundAddPlayerDialog
                  tournamentId={tournament.id}
                  roundId={roundId}
                  onAdded={onChanged}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tournament.participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No players yet. Add yourself or invite others.
            </p>
          ) : (
            <div className="space-y-2">
              {tournament.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {p.person.displayName}
                    </span>
                    {p.person.userId == null && (
                      <Badge variant="outline" className="text-xs">
                        Guest
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(p.handicapOverride ?? p.person.currentHandicap) !=
                      null && (
                      <Badge variant="outline">
                        HC {p.handicapOverride ?? p.person.currentHandicap}
                      </Badge>
                    )}
                    {isCommissioner && p.person.userId !== userId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive h-7 px-2"
                        onClick={() =>
                          handleRemoveParticipant(p.id, p.person.displayName)
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inline Teams section */}
          {showTeams && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Teams</span>
                  <Badge variant="secondary" className="text-xs">
                    {tournament.teams.length} team
                    {tournament.teams.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {isCommissioner && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New team name…"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateTeam}
                      disabled={creatingTeam || !newTeamName.trim()}
                      className="h-8"
                    >
                      {creatingTeam ? '…' : 'Add'}
                    </Button>
                  </div>
                )}

                {tournament.teams.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    No teams yet.{' '}
                    {isCommissioner
                      ? 'Create a team above.'
                      : 'The commissioner can create teams.'}
                  </p>
                )}

                {tournament.teams.map((team) => (
                  <div
                    key={team.id}
                    className="space-y-1 rounded-md border p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{team.name}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {team.members.length}
                        </Badge>
                        {isCommissioner && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive h-6 w-6 p-0 text-xs"
                            onClick={() =>
                              setDeleteConfirm({
                                teamId: team.id,
                                name: team.name,
                              })
                            }
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded px-2 py-0.5 text-sm"
                        >
                          <span>{m.participant.person.displayName}</span>
                          {isCommissioner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1 text-xs"
                              onClick={() => handleRemoveTeamMember(m.id)}
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {isCommissioner && unassignedForTeams.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {unassignedForTeams.map((p) => (
                          <Button
                            key={p.id}
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={() => handleAddTeamMember(team.id, p.id)}
                          >
                            + {p.person.displayName}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete team confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              This will delete <strong>{deleteConfirm?.name}</strong> and remove
              all its member assignments. Players will remain in the round.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirm && handleDeleteTeam(deleteConfirm.teamId)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ──────────────────────────────────────────────
// Single Round: Add Player Dialog
// ──────────────────────────────────────────────

function SingleRoundAddPlayerDialog({
  tournamentId,
  roundId,
  onAdded,
}: {
  tournamentId: string;
  roundId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'search' | 'guest'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    {
      id: string;
      displayName: string;
      currentHandicap: string | null;
      isGuest: boolean;
      email: string | null;
    }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestHandicap, setGuestHandicap] = useState('');

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await searchPersonsFn({
          data: { query: q, tournamentId },
        });
        setResults(data);
      } catch {
        // ignore
      }
      setSearching(false);
    },
    [tournamentId],
  );

  const handleAddPerson = async (personId: string, handicap: string | null) => {
    setAdding(true);
    try {
      const tp = await addParticipantFn({
        data: { tournamentId, personId, role: 'player' },
      });
      await addRoundParticipantFn({
        data: {
          roundId,
          personId,
          tournamentParticipantId: tp.participantId,
          handicapSnapshot: handicap ?? '0',
        },
      });
      toast.success('Player added!');
      setOpen(false);
      setQuery('');
      setResults([]);
      onAdded();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add player',
      );
    }
    setAdding(false);
  };

  const handleAddGuest = async () => {
    if (guestName.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    setAdding(true);
    try {
      const hc = guestHandicap ? parseFloat(guestHandicap) : null;
      const { personId } = await createGuestPersonFn({
        data: { displayName: guestName, currentHandicap: hc },
      });
      const tp = await addParticipantFn({
        data: { tournamentId, personId, role: 'player' },
      });
      await addRoundParticipantFn({
        data: {
          roundId,
          personId,
          tournamentParticipantId: tp.participantId,
          handicapSnapshot: guestHandicap || '0',
        },
      });
      toast.success(`${guestName} added!`);
      setOpen(false);
      setGuestName('');
      setGuestHandicap('');
      onAdded();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add guest',
      );
    }
    setAdding(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery('');
          setResults([]);
          setTab('search');
          setGuestName('');
          setGuestHandicap('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add Player</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
          <DialogDescription>
            Search for an existing player or add a guest.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === 'search' ? 'default' : 'outline'}
            onClick={() => setTab('search')}
          >
            Search
          </Button>
          <Button
            size="sm"
            variant={tab === 'guest' ? 'default' : 'outline'}
            onClick={() => setTab('guest')}
          >
            Add Guest
          </Button>
        </div>

        {tab === 'search' ? (
          <div className="space-y-3">
            <Input
              placeholder="Search by name…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {searching && (
              <p className="text-muted-foreground text-sm">Searching…</p>
            )}
            {results.length > 0 && (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {results.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {person.displayName}
                      </span>
                      {person.isGuest && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Guest
                        </Badge>
                      )}
                      {person.currentHandicap && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          HC {person.currentHandicap}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleAddPerson(person.id, person.currentHandicap)
                      }
                      disabled={adding}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {query.length >= 2 && results.length === 0 && !searching && (
              <p className="text-muted-foreground text-sm">
                No matches found.{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setTab('guest');
                    setGuestName(query);
                  }}
                >
                  Add as guest instead?
                </button>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="sr-guestName">Name</Label>
              <Input
                id="sr-guestName"
                placeholder="e.g. Dave Smith"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="sr-guestHandicap">Handicap (optional)</Label>
              <Input
                id="sr-guestHandicap"
                type="number"
                step="0.1"
                placeholder="e.g. 18.4"
                value={guestHandicap}
                onChange={(e) => setGuestHandicap(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddGuest} disabled={adding}>
                {adding ? 'Adding…' : 'Add Guest'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
