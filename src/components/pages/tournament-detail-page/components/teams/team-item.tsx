import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RemoveButton } from '@/components/ui/remove-button';
import { ArrowLeftRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTeamColor } from '@/config/team-colors';

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
  colorIndex?: number;
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
  colorIndex,
  unassignedParticipants,
  onAddMember,
  onRemoveMember,
  onMoveToTeam,
  onDelete,
}: TeamItemProps) {
  const otherTeams = allTeams.filter((t) => t.id !== team.id);
  const color = colorIndex !== undefined ? getTeamColor(colorIndex) : null;

  return (
    <div className="overflow-hidden rounded-xl border">
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          color ? color.headerBg : 'bg-muted',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{team.name}</span>
          <Badge variant="outline" className="bg-background/70 tabular-nums">
            {team.members.length}
          </Badge>
        </div>
        {canEdit && (
          <RemoveButton
            label={`Delete ${team.name}`}
            onClick={() => onDelete(team.id, team.name)}
          />
        )}
      </div>

      <div className="space-y-1 p-2">
        {team.members.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1 text-sm">
            No members yet.
          </p>
        ) : (
          team.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {m.participant.person.displayName}
              </span>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-1.5">
                  {otherTeams.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          aria-label="Move to another team"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {otherTeams.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            onClick={() => onMoveToTeam(m.id, t.id)}
                          >
                            {t.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <RemoveButton
                    label={`Remove ${m.participant.person.displayName} from team`}
                    onClick={() => onRemoveMember(m.id)}
                  />
                </div>
              )}
            </div>
          ))
        )}

        {canEdit && unassignedParticipants.length > 0 && (
          <div className="flex flex-wrap gap-1">
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
    </div>
  );
}
