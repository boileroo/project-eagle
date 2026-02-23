import { useState, useMemo } from 'react';
import {
  addParticipantFn,
  removeParticipantFn,
  ensureMyPersonFn,
} from '@/lib/tournaments.server';
import {
  createTeamFn,
  deleteTeamFn,
  deleteAllTeamsFn,
  addTeamMemberFn,
  removeTeamMemberFn,
} from '@/lib/teams.server';
import { deleteCompetitionFn } from '@/lib/competitions.server';
import {
  createRoundGroupFn,
  deleteRoundGroupFn,
  assignParticipantToGroupFn,
  autoAssignGroupsFn,
} from '@/lib/groups.server';
import { removeRoundParticipantFn } from '@/lib/rounds.server';
import { isGameFormat, isTeamFormat } from '@/lib/competitions';
import { cn } from '@/lib/utils';
import { X, ChevronDown } from 'lucide-react';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { EditHandicapDialog } from '@/components/tournament-detail/edit-handicap-dialog';
import { EditRoundHandicapDialog } from './edit-round-handicap-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { TournamentData, RoundData } from './types';

type CompetitionData = {
  id: string;
  formatType: string;
  name: string;
};

type ParticipantsSectionProps = {
  tournament?: TournamentData;
  round?: RoundData;
  isSingleRound?: boolean;
  competitions?: CompetitionData[];
  isCommissioner: boolean;
  userId: string;
  myPerson?: { id: string } | null;
  onChanged: () => void;
  defaultOpen?: boolean;
};

export function ParticipantsSection({
  tournament,
  round,
  isSingleRound = false,
  competitions,
  isCommissioner,
  userId,
  myPerson,
  onChanged,
  defaultOpen = true,
}: ParticipantsSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'groups'>(
    'players',
  );

  const hasTournament = !!tournament;
  const hasTeams = hasTournament && (tournament.teams.length > 0 || true); // Always show teams tab
  const hasGroups = !!round; // Always show Groups tab in round detail

  const tabs: { id: 'players' | 'teams' | 'groups'; label: string }[] = [];
  if (hasTournament) tabs.push({ id: 'players', label: 'Players' });
  if (hasTeams) tabs.push({ id: 'teams', label: 'Teams' });
  if (hasGroups) tabs.push({ id: 'groups', label: 'Groups' });

  const roundStatus = round?.status ?? 'draft';
  const isDraft = roundStatus === 'draft';

  // Determine what can be edited
  // Tournament detail (no round): always edit players & teams
  // Quick round (isSingleRound): edit players & teams if draft/scheduled
  // Tournament round (!isSingleRound && round): players & teams are read-only
  const canEditPlayers =
    isCommissioner && (!round || (isSingleRound && isDraft));
  const canEditTeams = isCommissioner && (!round || (isSingleRound && isDraft));
  const canEditGroups = isCommissioner && round && isDraft;

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between">
              <span>Participants</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {hasTournament && tournament.participants.length > 0
                    ? `${tournament.participants.length} player${tournament.participants.length !== 1 ? 's' : ''}`
                    : round?.participants.length
                      ? `${round.participants.length} player${round.participants.length !== 1 ? 's' : ''}`
                      : 'No participants'}
                </Badge>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                    sectionOpen && 'rotate-180',
                  )}
                />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {/* Tab buttons */}
            {tabs.length > 1 && (
              <div className="mb-4 flex border-b">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-primary text-primary border-b-2'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content */}
            <div className="min-h-[200px]">
              {activeTab === 'players' && (
                <PlayersTab
                  tournament={tournament}
                  round={round}
                  canEdit={canEditPlayers}
                  userId={userId}
                  myPerson={myPerson}
                  roundStatus={roundStatus}
                  onChanged={onChanged}
                />
              )}
              {activeTab === 'teams' && (
                <TeamsTab
                  tournament={tournament}
                  competitions={competitions}
                  canEdit={canEditTeams}
                  onChanged={onChanged}
                />
              )}
              {activeTab === 'groups' && round && (
                <GroupsTab
                  round={round}
                  canEdit={!!canEditGroups}
                  userId={userId}
                  onChanged={onChanged}
                />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────
// Players Tab
// ─────────────────────────────────────────────────────────

type PlayersTabProps = {
  tournament?: TournamentData;
  round?: RoundData;
  canEdit: boolean;
  userId: string;
  myPerson?: { id: string } | null;
  roundStatus: string;
  onChanged: () => void;
};

function PlayersTab({
  tournament,
  round,
  canEdit,
  userId,
  myPerson,
  roundStatus,
  onChanged,
}: PlayersTabProps) {
  const isDraft = roundStatus === 'draft';
  const isTournamentMode = !!tournament;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participants: any[] = isTournamentMode
    ? (tournament?.participants ?? [])
    : (round?.participants ?? []);

  const iAmParticipant = myPerson
    ? participants.some((p) => p.person.userId === userId)
    : false;

  const handleAddMyself = async () => {
    if (!tournament) return;
    try {
      const person = myPerson ?? (await ensureMyPersonFn());
      await addParticipantFn({
        data: {
          tournamentId: tournament.id,
          personId: person.id,
          role: 'player',
        },
      });
      toast.success('You joined!');
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
      if (tournament) {
        await removeParticipantFn({ data: { participantId } });
      } else if (round) {
        await removeRoundParticipantFn({
          data: { roundParticipantId: participantId },
        });
      }
      toast.success(`${name} removed.`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove');
    }
  };

  if (participants.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No players yet.
        {tournament && !iAmParticipant && isDraft && (
          <Button
            variant="link"
            size="sm"
            onClick={handleAddMyself}
            className="ml-1 h-auto p-0"
          >
            Join yourself
          </Button>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {participants.map((p) => {
        const personUserId = p.person.userId;
        const displayName = p.person.displayName;
        const handicapValue =
          p.handicapOverride ?? p.handicapSnapshot ?? p.person.currentHandicap;
        const isMe = personUserId === userId;
        const canRemove = canEdit && !isMe;

        return (
          <div
            key={p.id}
            className={cn(
              'flex items-center justify-between rounded-md border px-3 py-2',
              isMe && 'bg-primary/5',
              personUserId == null && 'border-dashed',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              {isMe && <Badge className="text-xs">You</Badge>}
              {personUserId == null && (
                <Badge variant="outline" className="text-xs">
                  Guest
                </Badge>
              )}
              {p.tournamentParticipant?.teamMemberships?.[0]?.team && (
                <Badge variant="secondary" className="text-xs">
                  {p.tournamentParticipant.teamMemberships[0].team.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* HC pill */}
              {canEdit || isMe ? (
                isTournamentMode ? (
                  <EditHandicapDialog
                    participant={{
                      id: p.id,
                      handicapOverride: p.handicapOverride,
                    }}
                    onSaved={onChanged}
                    trigger={
                      <button type="button" className="cursor-pointer">
                        <Badge variant="outline" className="hover:bg-accent">
                          HC {handicapValue ?? '--'}
                        </Badge>
                      </button>
                    }
                  />
                ) : (
                  <EditRoundHandicapDialog
                    roundParticipant={p as RoundData['participants'][number]}
                    onSaved={onChanged}
                    trigger={
                      <button type="button" className="cursor-pointer">
                        <Badge variant="outline" className="hover:bg-accent">
                          HC {handicapValue ?? '--'}
                        </Badge>
                      </button>
                    }
                  />
                )
              ) : (
                handicapValue != null && (
                  <Badge variant="outline">HC {handicapValue}</Badge>
                )
              )}

              {/* Remove button */}
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-6 w-6"
                  aria-label={`Remove ${displayName}`}
                  onClick={() => handleRemoveParticipant(p.id, displayName)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add myself button */}
      {tournament && !iAmParticipant && isDraft && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddMyself}
          className="mt-2"
        >
          Join
        </Button>
      )}

      {/* Add player button (commissioner) */}
      {tournament && canEdit && isDraft && (
        <AddPlayerDialog
          tournamentId={tournament.id}
          onAddPerson={async (person) => {
            await addParticipantFn({
              data: {
                tournamentId: tournament.id,
                personId: person.id,
                role: 'player',
              },
            });
            toast.success('Player added!');
            onChanged();
          }}
          onAddGuest={async (personId, name) => {
            await addParticipantFn({
              data: {
                tournamentId: tournament.id,
                personId,
                role: 'player',
              },
            });
            toast.success(`${name} added!`);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Teams Tab
// ─────────────────────────────────────────────────────────

type TeamsTabProps = {
  tournament?: TournamentData;
  competitions?: CompetitionData[];
  canEdit: boolean;
  onChanged: () => void;
};

function TeamsTab({
  tournament,
  competitions,
  canEdit,
  onChanged,
}: TeamsTabProps) {
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    teamId: string;
    name: string;
  } | null>(null);
  const [disableTeamsConfirm, setDisableTeamsConfirm] = useState(false);
  const [disablingTeams, setDisablingTeams] = useState(false);
  const [teamsEnabled, setTeamsEnabled] = useState(
    (tournament?.teams.length ?? 0) > 0,
  );

  if (!tournament) {
    return (
      <p className="text-muted-foreground text-sm">
        No tournament context for teams.
      </p>
    );
  }

  const hasExistingTeams = tournament.teams.length > 0;
  const showTeams = hasExistingTeams || teamsEnabled;

  const handleTeamsToggle = async (enabled: boolean) => {
    if (enabled) {
      // Check for existing games that need teams or specific setups and delete them
      const comps = competitions ?? [];
      const gamesToDelete = comps.filter((c: CompetitionData) =>
        isGameFormat(
          c.formatType as
            | 'match_play'
            | 'best_ball'
            | 'hi_lo'
            | 'rumble'
            | 'wolf'
            | 'six_point'
            | 'chair',
        ),
      );

      if (gamesToDelete.length > 0) {
        for (const comp of gamesToDelete) {
          try {
            await deleteCompetitionFn({ data: { competitionId: comp.id } });
          } catch (error) {
            console.error('Failed to delete game:', error);
          }
        }
        toast.success(
          `Removed ${gamesToDelete.length} incompatible game${gamesToDelete.length > 1 ? 's' : ''}. Recreate after teams are set up.`,
        );
      }
      setTeamsEnabled(true);
      onChanged();
    } else if (hasExistingTeams) {
      // Show confirmation dialog to disable teams
      setDisableTeamsConfirm(true);
    } else {
      setTeamsEnabled(false);
    }
  };

  const handleDisableTeams = async () => {
    setDisablingTeams(true);
    try {
      // Delete all games first
      const comps = competitions ?? [];
      const gamesToDelete = comps.filter((c: CompetitionData) =>
        isGameFormat(
          c.formatType as
            | 'match_play'
            | 'best_ball'
            | 'hi_lo'
            | 'rumble'
            | 'wolf'
            | 'six_point'
            | 'chair',
        ),
      );

      for (const comp of gamesToDelete) {
        try {
          await deleteCompetitionFn({ data: { competitionId: comp.id } });
        } catch (error) {
          console.error('Failed to delete game:', error);
        }
      }

      // Delete all teams
      await deleteAllTeamsFn({ data: { tournamentId: tournament.id } });

      toast.success('Teams disabled and all games removed.');
      setTeamsEnabled(false);
      setDisableTeamsConfirm(false);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to disable teams',
      );
    }
    setDisablingTeams(false);
  };

  const teams = tournament.teams;
  const assignedParticipantIds = new Set(
    teams.flatMap((t) => t.members.map((m) => m.participantId)),
  );
  const unassignedForTeams = tournament.participants.filter(
    (p) => !assignedParticipantIds.has(p.id),
  );

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
      // Delete games that require teams (team-based games)
      const comps = competitions ?? [];
      const teamGames = comps.filter((c: CompetitionData) =>
        isTeamFormat(c.formatType as 'best_ball' | 'hi_lo' | 'rumble'),
      );

      for (const comp of teamGames) {
        try {
          await deleteCompetitionFn({ data: { competitionId: comp.id } });
        } catch (error) {
          console.error('Failed to delete game:', error);
        }
      }

      if (teamGames.length > 0) {
        toast.success(
          `Team deleted. ${teamGames.length} game${teamGames.length > 1 ? 's' : ''} removed.`,
        );
      } else {
        toast.success('Team deleted.');
      }

      await deleteTeamFn({ data: { teamId } });
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
    <div className="space-y-4">
      {/* Teams enable toggle - only show when no teams exist yet */}
      {canEdit && teams.length === 0 && (
        <div className="flex items-center gap-2">
          <Switch
            id="teams-toggle"
            checked={showTeams}
            onCheckedChange={handleTeamsToggle}
          />
          <Label htmlFor="teams-toggle" className="text-sm font-medium">
            Enable Teams
          </Label>
        </div>
      )}

      {/* Only show teams UI if teams are enabled */}
      {showTeams && (
        <>
          {/* Create team input */}
          {canEdit && (
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

          {teams.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No teams yet.
              {canEdit
                ? ' Create one above to enable team vs team matches.'
                : ' The commissioner can create teams.'}
            </p>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div key={team.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{team.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {team.members.length}
                      </Badge>
                      {canEdit && (
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
                        {canEdit && (
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
                  {canEdit && unassignedForTeams.length > 0 && (
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
          )}
        </>
      )}

      {/* Delete team confirmation dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              This will delete <strong>{deleteConfirm?.name}</strong> and remove
              all its member assignments. Players will remain in the round. Any
              team-based games involving this team will also be deleted.
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

      {/* Disable teams confirmation dialog */}
      <Dialog
        open={disableTeamsConfirm}
        onOpenChange={(o) => !o && setDisableTeamsConfirm(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable teams?</DialogTitle>
            <DialogDescription>
              This will delete all {tournament.teams.length} team
              {tournament.teams.length !== 1 ? 's' : ''} and remove all player
              assignments. All games (Best Ball, Hi-Lo, Rumble, etc.) will also
              be deleted.
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
              onClick={handleDisableTeams}
            >
              {disablingTeams ? 'Disabling...' : 'Disable Teams'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Groups Tab
// ─────────────────────────────────────────────────────────

type GroupsTabProps = {
  round: RoundData;
  canEdit: boolean;
  userId: string;
  onChanged: () => void;
};

function GroupsTab({ round, canEdit, userId, onChanged }: GroupsTabProps) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignSize, setAutoAssignSize] = useState(4);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const isDraft = round.status === 'draft';
  const canEditGroups = canEdit && isDraft;
  const hasEnoughPlayersForGroups = round.participants.length > 4;
  // Only allow configuring groups if more than 4 players
  const canConfigureGroups = canEditGroups && hasEnoughPlayersForGroups;
  const showGroups = hasEnoughPlayersForGroups; // For message display

  const ungrouped = round.participants.filter((rp) => !rp.roundGroupId);
  const groups = round.groups ?? [];

  // For backwards compatibility
  const canAddGroups = canConfigureGroups;

  const groupParticipantsMap = useMemo(() => {
    const g = round.groups ?? [];
    const map = new Map<string, RoundData['participants']>();
    for (const group of g) {
      map.set(
        group.id,
        round.participants.filter((rp) => rp.roundGroupId === group.id),
      );
    }
    return map;
  }, [round.groups, round.participants]);

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

  const PlayerRow = ({
    rp,
    showGroupAssign = true,
  }: {
    rp: RoundData['participants'][number];
    showGroupAssign?: boolean;
  }) => {
    const isMe = rp.person.userId === userId;
    const hcValue = rp.handicapOverride ?? rp.handicapSnapshot;
    const canMoveGroup =
      canEditGroups &&
      showGroupAssign &&
      canConfigureGroups &&
      groups.length > 0;

    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-md border px-3 py-2',
          isMe && 'bg-primary/5',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{rp.person.displayName}</span>
          {isMe && <Badge className="text-xs">You</Badge>}
          {rp.tournamentParticipant?.teamMemberships?.[0]?.team && (
            <Badge variant="secondary" className="text-xs">
              {rp.tournamentParticipant.teamMemberships[0].team.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">HC {hcValue}</Badge>
          {canMoveGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="cursor-pointer">
                  <Badge
                    variant="secondary"
                    className="hover:bg-accent text-xs"
                  >
                    {rp.roundGroupId
                      ? (groups.find((g) => g.id === rp.roundGroupId)?.name ??
                        'Group')
                      : 'No group'}
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  if (round.participants.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No players in this round.</p>
    );
  }

  if (!showGroups || groups.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          {showGroups
            ? 'No groups configured yet.'
            : 'Add more than 4 players to enable groups.'}
        </p>
        {canAddGroups && (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group management buttons */}
      {canAddGroups && (
        <div className="flex gap-2">
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
        </div>
      )}

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

      {/* Unassigned */}
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
    </div>
  );
}
