import { useState } from 'react';
import {
  removeParticipantFn,
  updateParticipantFn,
} from '@/lib/tournaments.server';
import {
  createTeamFn,
  updateTeamFn,
  deleteTeamFn,
  deleteAllTeamsFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
import { AddParticipantDialog } from './add-participant-dialog';
import { EditHandicapDialog } from './edit-handicap-dialog';
import type { TeamsSectionTournament } from './types';

type PlayersAndTeamsTournament = {
  id: string;
  participants: {
    id: string;
    personId: string;
    role: string;
    handicapOverride: string | null;
    person: {
      id: string;
      displayName: string;
      userId: string | null;
      currentHandicap: string | null;
    };
  }[];
  teams: TeamsSectionTournament['teams'];
};

export function PlayersAndTeamsSection({
  tournament,
  isCommissioner,
  readOnly = false,
  userId,
  onChanged,
}: {
  tournament: PlayersAndTeamsTournament;
  isCommissioner: boolean;
  readOnly?: boolean;
  userId: string;
  onChanged: () => void;
}) {
  // When readOnly, suppress all commissioner edit controls
  const canEdit = isCommissioner && !readOnly;
  // ── Teams state ────────────────────────────────
  const hasTeams = tournament.teams.length > 0;
  const [teamsEnabled, setTeamsEnabled] = useState(hasTeams);
  const showTeams = hasTeams || teamsEnabled;
  const [disableTeamsConfirm, setDisableTeamsConfirm] = useState(false);
  const [disablingTeams, setDisablingTeams] = useState(false);
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
    (p) => !assignedParticipantIds.has(p.id),
  );

  // ── Player handlers ────────────────────────────

  const handleRemoveParticipant = async (
    participantId: string,
    name: string,
  ) => {
    try {
      await removeParticipantFn({ data: { participantId } });
      toast.success(`${name} removed from tournament.`);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove participant',
      );
    }
  };

  const handleRoleChange = async (
    participantId: string,
    role: 'marker' | 'player',
  ) => {
    await applyRoleChange(participantId, role);
  };

  const applyRoleChange = async (
    participantId: string,
    role: 'marker' | 'player',
  ) => {
    try {
      await updateParticipantFn({ data: { participantId, role } });
      toast.success('Role updated.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role',
      );
    }
  };

  // ── Team handlers ──────────────────────────────

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
      {/* ── Player list ─────────────────────────── */}
      {tournament.participants.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No players yet. Add yourself or invite others to get started.
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
              <div className="flex items-center gap-1.5">
                {/* ── HC pill ────────────────────── */}
                {canEdit ? (
                  <EditHandicapDialog
                    participant={p}
                    onSaved={() => onChanged()}
                    trigger={
                      <button type="button" className="cursor-pointer">
                        <Badge variant="outline" className="hover:bg-accent">
                          HC{' '}
                          {p.handicapOverride ??
                            p.person.currentHandicap ??
                            '--'}
                        </Badge>
                      </button>
                    }
                  />
                ) : (
                  (p.handicapOverride ?? p.person.currentHandicap) != null && (
                    <Badge variant="outline">
                      HC {p.handicapOverride ?? p.person.currentHandicap}
                    </Badge>
                  )
                )}

                {/* ── Role pill ───────────────────── */}
                {canEdit &&
                p.role !== 'commissioner' &&
                p.person.userId != null ? (
                  // Registered non-commissioner: clickable role dropdown (player/marker)
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="cursor-pointer">
                        <Badge variant="secondary" className="hover:bg-accent">
                          {p.role}
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(['player', 'marker'] as const).map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleRoleChange(p.id, role)}
                          disabled={p.role === role}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                          {p.role === role ? ' ✓' : ''}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  // Commissioner's own row, guest, or non-commissioner view: static badge
                  <Badge
                    variant={
                      p.role === 'commissioner' ? 'default' : 'secondary'
                    }
                  >
                    {p.role}
                  </Badge>
                )}

                {/* ── Remove button ──────────────── */}
                {canEdit && p.role !== 'commissioner' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-6 w-6"
                    onClick={() =>
                      handleRemoveParticipant(p.id, p.person.displayName)
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Teams sub-section ───────────────────── */}
      {canEdit && (
        <>
          <Separator className="my-4" />
          <div className="flex items-center gap-2">
            <Switch
              id="tournament-teams-toggle"
              checked={showTeams}
              onCheckedChange={(checked) => {
                if (checked) {
                  setTeamsEnabled(true);
                } else if (hasTeams) {
                  setDisableTeamsConfirm(true);
                } else {
                  setTeamsEnabled(false);
                }
              }}
              className="scale-75"
            />
            <Label
              htmlFor="tournament-teams-toggle"
              className="text-muted-foreground cursor-pointer text-sm font-medium"
            >
              Enable Teams
            </Label>
          </div>
        </>
      )}

      {showTeams && (
        <div className="mt-4 space-y-4">
          {canEdit && (
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

                    {canEdit && editingTeamId !== team.id && (
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
                          {canEdit && (
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

                  {canEdit && unassigned.length > 0 && (
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
                    tournament.participants.length > 0 &&
                    team.members.length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        All players are assigned to teams.
                      </p>
                    )}
                </div>
              ))}

              {unassigned.length > 0 && tournament.teams.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {unassigned.length} player
                  {unassigned.length !== 1 ? 's' : ''} not yet assigned to a
                  team.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Show teams read-only when not in edit mode */}
      {!canEdit && showTeams && tournament.teams.length > 0 && (
        <div className="mt-4 space-y-4">
          <Separator />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Teams</span>
            <Badge variant="secondary">
              {tournament.teams.length} team
              {tournament.teams.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-4">
            {tournament.teams.map((team) => (
              <div key={team.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{team.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {team.members.length} player
                    {team.members.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {team.members.length > 0 && (
                  <div className="ml-1 space-y-1">
                    {team.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center rounded px-2 py-1 text-sm"
                      >
                        <span>{m.participant.person.displayName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────── */}

      {/* Disable teams confirmation */}
      <Dialog
        open={disableTeamsConfirm}
        onOpenChange={(open) => !open && setDisableTeamsConfirm(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable teams?</DialogTitle>
            <DialogDescription>
              This will delete all {tournament.teams.length} team
              {tournament.teams.length !== 1 ? 's' : ''} and remove all player
              assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisableTeamsConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={disablingTeams}
              onClick={async () => {
                setDisablingTeams(true);
                try {
                  await deleteAllTeamsFn({
                    data: { tournamentId: tournament.id },
                  });
                  toast.success('All teams deleted.');
                  setTeamsEnabled(false);
                  setDisableTeamsConfirm(false);
                  onChanged();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Failed to delete teams',
                  );
                }
                setDisablingTeams(false);
              }}
            >
              {disablingTeams ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

/** Header actions for the PlayersAndTeams collapsible section */
export function PlayersAndTeamsActions({
  tournamentId,
  iAmParticipant,
  isCommissioner,
  onJoin,
  onChanged,
}: {
  tournamentId: string;
  iAmParticipant: boolean;
  isCommissioner: boolean;
  onJoin: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {!iAmParticipant && (
        <Button size="sm" variant="outline" onClick={onJoin}>
          Join
        </Button>
      )}
      {isCommissioner && (
        <AddParticipantDialog tournamentId={tournamentId} onAdded={onChanged} />
      )}
    </div>
  );
}
