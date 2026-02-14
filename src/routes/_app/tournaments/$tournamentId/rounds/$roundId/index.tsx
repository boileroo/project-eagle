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
import { Scorecard } from '@/components/scorecard';
import { ScoreEntryDialog } from '@/components/score-entry-dialog';
import { ScoreHistoryDialog } from '@/components/score-history-dialog';
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
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_app/tournaments/$tournamentId/rounds/$roundId/',
)({
  loader: async ({ params }) => {
    const [round, courses, scorecard] = await Promise.all([
      getRoundFn({ data: { roundId: params.roundId } }),
      getCoursesFn(),
      getScorecardFn({ data: { roundId: params.roundId } }),
    ]);
    return { round, courses, scorecard };
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
  const { round, courses, scorecard } = Route.useLoaderData();
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

  const tournamentId = round.tournamentId!;

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
