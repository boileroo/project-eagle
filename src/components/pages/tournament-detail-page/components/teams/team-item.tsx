import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type TeamMember = {
  id: string;
  participant: {
    person: {
      displayName: string;
    };
  };
};

type Team = {
  id: string;
  name: string;
  members: TeamMember[];
};

type TeamItemProps = {
  team: Team;
  allTeams: { id: string; name: string }[];
  canEdit: boolean;
  unassignedParticipants: {
    id: string;
    person: {
      displayName: string;
    };
  }[];
  onAddMember: (teamId: string, participantId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onMoveToTeam: (memberId: string, targetTeamId: string) => void;
  onDelete: (teamId: string, teamName: string) => void;
};

export function TeamItem({
  team,
  allTeams,
  canEdit,
  unassignedParticipants,
  onAddMember,
  onRemoveMember,
  onMoveToTeam,
  onDelete,
}: TeamItemProps) {
  const otherTeams = allTeams.filter((t) => t.id !== team.id);

  return (
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
              onClick={() => onDelete(team.id, team.name)}
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
              <div className="flex items-center gap-1">
                {otherTeams.length > 0 && (
                  <select
                    className="text-muted-foreground h-5 cursor-pointer border-none bg-transparent text-xs focus:outline-none"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        onMoveToTeam(m.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="" disabled>
                      Move to…
                    </option>
                    {otherTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1 text-xs"
                  onClick={() => onRemoveMember(m.id)}
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {canEdit && unassignedParticipants.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {unassignedParticipants.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={() => onAddMember(team.id, p.id)}
            >
              + {p.person.displayName}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
