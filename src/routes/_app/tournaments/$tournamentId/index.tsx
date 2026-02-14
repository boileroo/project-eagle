import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  getTournamentFn,
  deleteTournamentFn,
  searchPersonsFn,
  addParticipantFn,
  removeParticipantFn,
  updateParticipantFn,
  createGuestPersonFn,
  getMyPersonFn,
} from '@/lib/tournaments.server';
import {
  createTeamFn,
  updateTeamFn,
  deleteTeamFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
import { getCoursesFn } from '@/lib/courses.server';
import { createRoundFn, reorderRoundsFn } from '@/lib/rounds.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';
import { useRouter } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/tournaments/$tournamentId/')({
  loader: async ({ params }) => {
    const [tournament, myPerson, courses] = await Promise.all([
      getTournamentFn({ data: { tournamentId: params.tournamentId } }),
      getMyPersonFn(),
      getCoursesFn(),
    ]);
    return { tournament, myPerson, courses };
  },
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { tournament, myPerson, courses } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commissionerConfirm, setCommissionerConfirm] = useState<{
    participantId: string;
    name: string;
  } | null>(null);

  const isOwner = user?.id === tournament.createdByUserId;
  const iAmParticipant = myPerson
    ? tournament.participants.some((p) => p.personId === myPerson.id)
    : false;
  const currentCommissioner = tournament.participants.find(
    (p) => p.role === 'commissioner',
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournamentFn({ data: { tournamentId: tournament.id } });
      toast.success('Tournament deleted.');
      navigate({ to: '/tournaments' });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete tournament',
      );
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleAddMyself = async () => {
    if (!myPerson) return;
    try {
      await addParticipantFn({
        data: {
          tournamentId: tournament.id,
          personId: myPerson.id,
          role: isOwner ? 'commissioner' : 'player',
        },
      });
      toast.success('Added to the tournament!');
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add yourself',
      );
    }
  };

  const handleRemoveParticipant = async (participantId: string, name: string) => {
    try {
      await removeParticipantFn({ data: { participantId } });
      toast.success(`${name} removed from tournament.`);
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove participant',
      );
    }
  };

  const handleRoleChange = async (
    participantId: string,
    role: 'commissioner' | 'marker' | 'player' | 'spectator',
    personName?: string,
  ) => {
    // If promoting to commissioner and there's an existing one, confirm first
    if (role === 'commissioner' && currentCommissioner && currentCommissioner.id !== participantId) {
      setCommissionerConfirm({ participantId, name: personName ?? 'this person' });
      return;
    }
    await applyRoleChange(participantId, role);
  };

  const applyRoleChange = async (
    participantId: string,
    role: 'commissioner' | 'marker' | 'player' | 'spectator',
  ) => {
    try {
      await updateParticipantFn({ data: { participantId, role } });
      toast.success('Role updated.');
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role',
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="text-muted-foreground mt-1">
              {tournament.description}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link
                to="/tournaments/$tournamentId/edit"
                params={{ tournamentId: tournament.id }}
              >
                Edit
              </Link>
            </Button>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete tournament?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete{' '}
                    <strong>{tournament.name}</strong> and all its participants,
                    rounds, scores, and competitions. This action cannot be
                    undone.
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
          </div>
        )}
      </div>

      {/* Commissioner change confirmation dialog */}
      <Dialog
        open={commissionerConfirm !== null}
        onOpenChange={(open) => !open && setCommissionerConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change commissioner?</DialogTitle>
            <DialogDescription>
              <strong>{commissionerConfirm?.name}</strong> will become the new
              commissioner.{' '}
              {currentCommissioner && (
                <>
                  <strong>{currentCommissioner.person.displayName}</strong> will
                  be demoted to Player.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommissionerConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (commissionerConfirm) {
                  await applyRoleChange(
                    commissionerConfirm.participantId,
                    'commissioner',
                  );
                }
                setCommissionerConfirm(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator />

      {/* Participants section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Players</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {tournament.participants.length} player
                {tournament.participants.length !== 1 ? 's' : ''}
              </Badge>
              {!iAmParticipant && myPerson && (
                <Button size="sm" variant="outline" onClick={handleAddMyself}>
                  Join
                </Button>
              )}
              <AddParticipantDialog
                tournamentId={tournament.id}
                onAdded={() => router.invalidate()}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No players yet. Add yourself or invite others to get started.
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
                    {(p.handicapOverride ?? p.person.currentHandicap) != null && (
                      <Badge variant="outline">
                        HC{' '}
                        {p.handicapOverride ?? p.person.currentHandicap}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Badge
                            variant={
                              p.role === 'commissioner'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {p.role}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(p.person.userId == null
                          ? (['player', 'spectator'] as const)
                          : (['commissioner', 'player', 'marker', 'spectator'] as const)
                        ).map((role) => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => handleRoleChange(p.id, role, p.person.displayName)}
                            disabled={p.role === role}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                            {p.role === role ? ' ✓' : ''}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <EditHandicapDialog
                          participant={p}
                          onSaved={() => router.invalidate()}
                        />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            handleRemoveParticipant(
                              p.id,
                              p.person.displayName,
                            )
                          }
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams section */}
      <TeamsSection
        tournament={tournament}
        onChanged={() => router.invalidate()}
      />

      {/* Rounds section */}
      <RoundsSection
        tournament={tournament}
        courses={courses}
        onChanged={() => router.invalidate()}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Add Participant Dialog (search + add guest)
// ──────────────────────────────────────────────

function AddParticipantDialog({
  tournamentId,
  onAdded,
}: {
  tournamentId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'search' | 'guest'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { id: string; displayName: string; currentHandicap: string | null; isGuest: boolean; email: string | null }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Guest form state
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
        // ignore search errors
      }
      setSearching(false);
    },
    [tournamentId],
  );

  const handleAddPerson = async (personId: string) => {
    setAdding(true);
    try {
      await addParticipantFn({
        data: { tournamentId, personId, role: 'player' },
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
        data: {
          displayName: guestName,
          currentHandicap: hc,
        },
      });
      await addParticipantFn({
        data: { tournamentId, personId, role: 'player' },
      });
      toast.success(`${guestName} added as a guest!`);
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

        {/* Tab toggle */}
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
                      {person.email && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {person.email}
                        </span>
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
                      onClick={() => handleAddPerson(person.id)}
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
              <Label htmlFor="guestName">Name</Label>
              <Input
                id="guestName"
                placeholder="e.g. Dave Smith"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="guestHandicap">Handicap (optional)</Label>
              <Input
                id="guestHandicap"
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

// ──────────────────────────────────────────────
// Edit Handicap Override Dialog (inline in dropdown)
// ──────────────────────────────────────────────

function EditHandicapDialog({
  participant,
  onSaved,
}: {
  participant: { id: string; handicapOverride: string | null };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(participant.handicapOverride ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const hc = value ? parseFloat(value) : null;
      await updateParticipantFn({
        data: { participantId: participant.id, handicapOverride: hc },
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
          <DialogTitle>Handicap Override</DialogTitle>
          <DialogDescription>
            Set a tournament-specific handicap. Leave blank to use the player's
            current handicap.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="number"
          step="0.1"
          placeholder="e.g. 18.4"
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
// Add Round Dialog
// ──────────────────────────────────────────────

function AddRoundDialog({
  tournamentId,
  courses,
  onAdded,
}: {
  tournamentId: string;
  courses: { id: string; name: string; location: string | null; numberOfHoles: number }[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [teeTime, setTeeTime] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!courseId) {
      toast.error('Please select a course');
      return;
    }
    setAdding(true);
    try {
      await createRoundFn({
        data: {
          tournamentId,
          courseId,
          date: date || undefined,
          teeTime: teeTime || undefined,
        },
      });
      toast.success('Round created! All tournament players have been added.');
      setOpen(false);
      setCourseId('');
      setDate('');
      setTeeTime('');
      onAdded();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create round',
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
          setCourseId('');
          setDate('');
          setTeeTime('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add Round</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Round</DialogTitle>
          <DialogDescription>
            Select a course and optionally set a date and tee time. All
            current tournament players will be automatically added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="courseSelect">Course</Label>
            <select
              id="courseSelect"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.numberOfHoles} holes)
                  {c.location ? ` — ${c.location}` : ''}
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                No courses yet.{' '}
                <Link to="/courses/new" className="text-primary underline">
                  Create one first
                </Link>
                .
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="roundDate">Date (optional)</Label>
              <Input
                id="roundDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="roundTeeTime">Tee Time (optional)</Label>
              <Input
                id="roundTeeTime"
                type="time"
                value={teeTime}
                onChange={(e) => setTeeTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAdd} disabled={adding || !courseId}>
            {adding ? 'Creating…' : 'Create Round'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Rounds Section (with reorder)
// ──────────────────────────────────────────────

function RoundsSection({
  tournament,
  courses,
  onChanged,
}: {
  tournament: {
    id: string;
    rounds: {
      id: string;
      roundNumber: number | null;
      date: string | Date | null;
      teeTime: string | null;
      status: string;
      course: { id: string; name: string } | null;
    }[];
  };
  courses: { id: string; name: string; location: string | null; numberOfHoles: number }[];
  onChanged: () => void;
}) {
  const sortedRounds = tournament.rounds;

  // Check if a round can move up (only undated rounds, only swap with adjacent undated)
  const canMoveUp = (idx: number) => {
    if (idx <= 0) return false;
    return sortedRounds[idx].date == null && sortedRounds[idx - 1].date == null;
  };

  // Check if a round can move down
  const canMoveDown = (idx: number) => {
    if (idx >= sortedRounds.length - 1) return false;
    return sortedRounds[idx].date == null && sortedRounds[idx + 1].date == null;
  };

  // Whether this round should show reorder arrows at all
  const showArrows = (idx: number) => {
    if (sortedRounds[idx].date != null) return false;
    // Show if there's at least one adjacent undated round
    return canMoveUp(idx) || canMoveDown(idx);
  };

  // Need a stable column width for arrows so links align
  const anyArrowsVisible = sortedRounds.some((_, idx) => showArrows(idx));

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const ids = sortedRounds.map((r) => r.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    try {
      await reorderRoundsFn({
        data: { tournamentId: tournament.id, roundIds: ids },
      });
      toast.success('Round order updated.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reorder',
      );
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= sortedRounds.length - 1) return;
    const ids = sortedRounds.map((r) => r.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    try {
      await reorderRoundsFn({
        data: { tournamentId: tournament.id, roundIds: ids },
      });
      toast.success('Round order updated.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reorder',
      );
    }
  };

  const formatDateTime = (r: { date: string | Date | null; teeTime: string | null }) => {
    if (!r.date) return null;
    const d = new Date(r.date);
    const datePart = d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (r.teeTime) {
      return `${datePart} · ${r.teeTime}`;
    }
    return datePart;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Rounds</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {sortedRounds.length} round
              {sortedRounds.length !== 1 ? 's' : ''}
            </Badge>
            <AddRoundDialog
              tournamentId={tournament.id}
              courses={courses}
              onAdded={onChanged}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRounds.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No rounds yet. Add a round to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedRounds.map((r, idx) => (
              <div
                key={r.id}
                className="flex items-center gap-2"
              >
                {/* Reorder arrows — shown for undated rounds with adjacent undated neighbours */}
                {anyArrowsVisible && (
                  <div className="flex w-4 flex-col items-center">
                    {showArrows(idx) ? (
                      <>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground disabled:opacity-25 px-0.5 text-xs leading-none"
                          disabled={!canMoveUp(idx)}
                          onClick={() => handleMoveUp(idx)}
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground disabled:opacity-25 px-0.5 text-xs leading-none"
                          disabled={!canMoveDown(idx)}
                          onClick={() => handleMoveDown(idx)}
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
                <Link
                  to="/tournaments/$tournamentId/rounds/$roundId"
                  params={{
                    tournamentId: tournament.id,
                    roundId: r.id,
                  }}
                  className="group flex flex-1 items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium group-hover:text-primary">
                      Round {idx + 1}
                    </span>
                    {r.course && (
                      <span className="text-muted-foreground text-sm">
                        @ {r.course.name}
                      </span>
                    )}
                    {formatDateTime(r) && (
                      <span className="text-muted-foreground text-xs">
                        · {formatDateTime(r)}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={r.status === 'finalized' ? 'default' : 'outline'}
                  >
                    {r.status}
                  </Badge>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Teams Section
// ──────────────────────────────────────────────

type TournamentData = {
  id: string;
  participants: {
    id: string;
    personId: string;
    role: string;
    person: { id: string; displayName: string; userId: string | null };
  }[];
  teams: {
    id: string;
    name: string;
    members: {
      id: string;
      participantId: string;
      participant: {
        id: string;
        person: { id: string; displayName: string };
      };
    }[];
  }[];
};

function TeamsSection({
  tournament,
  onChanged,
}: {
  tournament: TournamentData;
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    teamId: string;
    name: string;
  } | null>(null);

  // Build a set of participant IDs already assigned to a team
  const assignedParticipantIds = new Set(
    tournament.teams.flatMap((t) => t.members.map((m) => m.participantId)),
  );

  // Unassigned participants (only players/markers, not spectators)
  const unassigned = tournament.participants.filter(
    (p) =>
      !assignedParticipantIds.has(p.id) &&
      p.role !== 'spectator',
  );

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
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
    setCreating(false);
  };

  const handleRenameTeam = async (teamId: string) => {
    if (!editingName.trim()) return;
    try {
      await updateTeamFn({ data: { teamId, name: editingName.trim() } });
      toast.success('Team renamed.');
      setEditingTeamId(null);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to rename team',
      );
    }
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

  const handleAddMember = async (teamId: string, participantId: string) => {
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

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMemberFn({ data: { memberId } });
      toast.success('Player removed from team.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to remove from team',
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Teams</span>
            <Badge variant="secondary">
              {tournament.teams.length} team
              {tournament.teams.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create team inline */}
          <div className="flex gap-2">
            <Input
              placeholder="New team name…"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTeam();
              }}
              className="max-w-xs"
            />
            <Button
              size="sm"
              onClick={handleCreateTeam}
              disabled={creating || !newTeamName.trim()}
            >
              {creating ? 'Creating…' : 'Add Team'}
            </Button>
          </div>

          {tournament.teams.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No teams yet. Create a team to start assigning players.
            </p>
          ) : (
            <div className="space-y-4">
              {tournament.teams.map((team) => (
                <div key={team.id} className="rounded-lg border p-3 space-y-2">
                  {/* Team header */}
                  <div className="flex items-center justify-between">
                    {editingTeamId === team.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameTeam(team.id);
                            if (e.key === 'Escape') setEditingTeamId(null);
                          }}
                          className="max-w-xs h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() => handleRenameTeam(team.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          onClick={() => setEditingTeamId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {team.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {team.members.length} player
                          {team.members.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}

                    {editingTeamId !== team.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            ⋯
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTeamId(team.id);
                              setEditingName(team.name);
                            }}
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setDeleteConfirm({
                                teamId: team.id,
                                name: team.name,
                              })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Team members */}
                  {team.members.length > 0 && (
                    <div className="space-y-1 ml-1">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50"
                        >
                          <span>{m.participant.person.displayName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(m.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add member dropdown */}
                  {unassigned.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                        >
                          + Add Player
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {unassigned.map((p) => (
                          <DropdownMenuItem
                            key={p.id}
                            onClick={() => handleAddMember(team.id, p.id)}
                          >
                            {p.person.displayName}
                            {p.person.userId == null && (
                              <span className="text-muted-foreground ml-1">
                                (Guest)
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {unassigned.length === 0 &&
                    tournament.participants.filter((p) => p.role !== 'spectator').length > 0 &&
                    team.members.length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        All players are assigned to teams.
                      </p>
                    )}
                </div>
              ))}

              {/* Unassigned summary */}
              {unassigned.length > 0 && tournament.teams.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {unassigned.length} player{unassigned.length !== 1 ? 's' : ''}{' '}
                  not yet assigned to a team.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete team confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              This will delete <strong>{deleteConfirm?.name}</strong> and
              remove all its member assignments. The players will remain in
              the tournament.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
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
