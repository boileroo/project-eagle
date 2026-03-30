import { useState } from 'react';
import {
  useCreateTeam,
  useAddTeamMember,
  useRemoveTeamMember,
  useMoveTeamMember,
} from '@/lib/teams';
import { ArrowRight, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { TournamentLoaderData, CompetitionData } from '@/types';
import { TeamItem } from './team-item';
import { DeleteTeamDialog } from './delete-team-dialog';
import { DisableTeamsDialog } from './disable-teams-dialog';

type TeamsTabProps = {
  tournament?: TournamentLoaderData;
  competitions?: CompetitionData[];
  canEdit: boolean;
  onChanged: () => void;
};

export function TeamsTab({
  tournament,
  competitions,
  canEdit,
  onChanged,
}: TeamsTabProps) {
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeam] = useCreateTeam();
  const [addTeamMember] = useAddTeamMember();
  const [removeTeamMember] = useRemoveTeamMember();
  const [moveTeamMember] = useMoveTeamMember();
  const [newTeamName, setNewTeamName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    teamId: string;
    name: string;
  } | null>(null);
  const [disableTeamsConfirm, setDisableTeamsConfirm] = useState(false);
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
      setTeamsEnabled(true);
      onChanged();
    } else if (hasExistingTeams) {
      setDisableTeamsConfirm(true);
    } else {
      setTeamsEnabled(false);
    }
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
    await createTeam({
      variables: { tournamentId: tournament.id, name: newTeamName.trim() },
      onSuccess: () => {
        toast.success('Team created!');
        setNewTeamName('');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
    setCreatingTeam(false);
  };

  const handleAddTeamMember = async (teamId: string, participantId: string) => {
    await addTeamMember({
      variables: { teamId, participantId },
      onSuccess: () => {
        toast.success('Player added to team.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    await removeTeamMember({
      variables: { memberId },
      onSuccess: () => {
        toast.success('Player removed from team.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleMoveTeamMember = async (
    memberId: string,
    targetTeamId: string,
  ) => {
    await moveTeamMember({
      variables: { memberId, targetTeamId },
      onSuccess: () => {
        toast.success('Player moved to team.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <div className="space-y-4">
      {canEdit && teams.length === 0 && (
        <div className="from-card via-card to-primary/5 border-border/70 overflow-hidden rounded-xl border bg-gradient-to-br shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <Label
                    htmlFor="teams-toggle"
                    className="text-sm font-semibold"
                  >
                    Enable Teams
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Create fixed teams that carry across the tournament.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="bg-background/70 border-border/60 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Trophy className="text-primary h-4 w-4" />
                    What teams unlock
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Team matches for points plus tournament team standings
                    alongside the individual leaderboard.
                  </p>
                </div>

                <div className="bg-background/70 border-border/60 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ArrowRight className="text-primary h-4 w-4" />
                    Different from groups
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Groups are round-by-round playing groups. Teams are fixed
                    across multiple rounds.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background/80 border-border/60 flex items-center gap-3 self-start rounded-full border px-3 py-2">
              <Switch
                id="teams-toggle"
                checked={showTeams}
                onCheckedChange={handleTeamsToggle}
              />
              <span className="text-sm font-medium">
                {showTeams ? 'Teams enabled' : 'Turn on'}
              </span>
            </div>
          </div>
        </div>
      )}

      {showTeams && (
        <>
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
                <TeamItem
                  key={team.id}
                  team={team}
                  allTeams={teams.map((t) => ({ id: t.id, name: t.name }))}
                  canEdit={canEdit}
                  unassignedParticipants={unassignedForTeams}
                  onAddMember={handleAddTeamMember}
                  onRemoveMember={handleRemoveTeamMember}
                  onMoveToTeam={handleMoveTeamMember}
                  onDelete={(teamId, teamName) =>
                    setDeleteConfirm({ teamId, name: teamName })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <DeleteTeamDialog
        open={deleteConfirm !== null}
        teamId={deleteConfirm?.teamId ?? ''}
        teamName={deleteConfirm?.name ?? ''}
        competitions={competitions ?? []}
        onClose={() => setDeleteConfirm(null)}
        onDeleted={() => {
          setDeleteConfirm(null);
          onChanged();
        }}
      />

      <DisableTeamsDialog
        open={disableTeamsConfirm}
        tournamentId={tournament.id}
        teamsCount={tournament.teams.length}
        competitions={competitions ?? []}
        onClose={() => setDisableTeamsConfirm(false)}
        onDisabled={() => {
          setDisableTeamsConfirm(false);
          onChanged();
        }}
      />
    </div>
  );
}
