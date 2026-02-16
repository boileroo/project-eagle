import { useState, useCallback } from 'react';
import {
  addParticipantFn,
  removeParticipantFn,
  searchPersonsFn,
  createGuestPersonFn,
  ensureMyPersonFn,
} from '@/lib/tournaments.server';
import {
  addRoundParticipantFn,
} from '@/lib/rounds.server';
import {
  createTeamFn,
  deleteTeamFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { TournamentData } from './types';

export function SingleRoundPlayersSection({
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
