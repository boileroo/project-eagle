import { useState } from 'react';
import {
  addParticipantFn,
  removeParticipantFn,
  ensureMyPersonFn,
} from '@/lib/tournaments.server';
import { addRoundParticipantFn } from '@/lib/rounds.server';
import { cn } from '@/lib/utils';
import {
  createTeamFn,
  deleteTeamFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
import { AddPlayerDialog } from '@/components/add-player-dialog';
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
              {isCommissioner && (
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
              )}
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
                <AddPlayerDialog
                  tournamentId={tournament.id}
                  onAddPerson={async (person) => {
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
                        handicapSnapshot: person.currentHandicap ?? '0',
                      },
                    });
                    toast.success('Player added!');
                    onChanged();
                  }}
                  onAddGuest={async (personId, name, handicap) => {
                    const tp = await addParticipantFn({
                      data: {
                        tournamentId: tournament.id,
                        personId,
                        role: 'player',
                      },
                    });
                    await addRoundParticipantFn({
                      data: {
                        roundId,
                        personId,
                        tournamentParticipantId: tp.participantId,
                        handicapSnapshot: handicap || '0',
                      },
                    });
                    toast.success(`${name} added!`);
                    onChanged();
                  }}
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
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3 py-2',
                    p.person.userId === userId && 'bg-primary/5',
                    p.person.userId == null && 'border-dashed',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {p.person.displayName}
                    </span>
                    {p.person.userId === userId && (
                      <Badge className="text-xs">You</Badge>
                    )}
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
