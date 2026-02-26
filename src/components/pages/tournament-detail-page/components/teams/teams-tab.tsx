import { useState } from 'react';
import {
  useCreateTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from '@/lib/teams';
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

  return (
    <div className="space-y-4">
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
                  canEdit={canEdit}
                  unassignedParticipants={unassignedForTeams}
                  onAddMember={handleAddTeamMember}
                  onRemoveMember={handleRemoveTeamMember}
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
