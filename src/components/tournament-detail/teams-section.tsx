import { useState } from 'react';
import {
  createTeamFn,
  updateTeamFn,
  deleteTeamFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { TeamsSectionTournament } from './types';

export function TeamsSection({
  tournament,
  isCommissioner,
  onChanged,
}: {
  tournament: TeamsSectionTournament;
  isCommissioner: boolean;
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

  const assignedParticipantIds = new Set(
    tournament.teams.flatMap((t) => t.members.map((m) => m.participantId)),
  );

  const unassigned = tournament.participants.filter(
    (p) => !assignedParticipantIds.has(p.id) && p.role !== 'spectator',
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
        error instanceof Error ? error.message : 'Failed to remove from team',
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
          {isCommissioner && (
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
          )}

          {tournament.teams.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No teams yet. Create a team to start assigning players.
            </p>
          ) : (
            <div className="space-y-4">
              {tournament.teams.map((team) => (
                <div key={team.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    {editingTeamId === team.id ? (
                      <div className="mr-2 flex flex-1 gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameTeam(team.id);
                            if (e.key === 'Escape') setEditingTeamId(null);
                          }}
                          className="h-7 max-w-xs text-sm"
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

                    {isCommissioner && editingTeamId !== team.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                          >
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

                  {team.members.length > 0 && (
                    <div className="ml-1 space-y-1">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="hover:bg-muted/50 flex items-center justify-between rounded px-2 py-1 text-sm"
                        >
                          <span>{m.participant.person.displayName}</span>
                          {isCommissioner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive h-6 px-2 text-xs"
                              onClick={() => handleRemoveMember(m.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isCommissioner && unassigned.length > 0 && (
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
                    tournament.participants.filter(
                      (p) => p.role !== 'spectator',
                    ).length > 0 &&
                    team.members.length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        All players are assigned to teams.
                      </p>
                    )}
                </div>
              ))}

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
              This will delete <strong>{deleteConfirm?.name}</strong> and remove
              all its member assignments. The players will remain in the
              tournament.
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
