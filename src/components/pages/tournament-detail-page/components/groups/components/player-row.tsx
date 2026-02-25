import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RoundData } from '@/types';

interface PlayerRowProps {
  rp: RoundData['participants'][number];
  userId: string;
  groups: RoundData['groups'];
  canMoveGroup: boolean;
  assigning: string | null;
  onAssignToGroup: (roundParticipantId: string, groupId: string | null) => void;
  showGroupAssign?: boolean;
}

export function PlayerRow({
  rp,
  userId,
  groups,
  canMoveGroup,
  assigning,
  onAssignToGroup,
  showGroupAssign = true,
}: PlayerRowProps) {
  const isMe = rp.person.userId === userId;
  const hcValue = rp.handicapOverride ?? rp.handicapSnapshot;

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 ${
        isMe ? 'bg-primary/5' : ''
      }`}
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
        {canMoveGroup && showGroupAssign && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="cursor-pointer">
                <Badge variant="secondary" className="hover:bg-accent text-xs">
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
                    onClick={() => onAssignToGroup(rp.id, g.id)}
                  >
                    Move to {g.name || `Group ${g.groupNumber}`}
                  </DropdownMenuItem>
                ))}
              {rp.roundGroupId && (
                <DropdownMenuItem
                  disabled={assigning === rp.id}
                  onClick={() => onAssignToGroup(rp.id, null)}
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
}
