import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTeamColor } from '@/config/team-colors';
import type { RoundData } from '@/types';

interface PlayerRowProps {
  rp: RoundData['players'][number];
  userId: string;
  groups: RoundData['groups'];
  canMoveGroup: boolean;
  assigning: string | null;
  onAssignToGroup: (roundPlayerId: string, groupId: string | null) => void;
  showGroupAssign?: boolean;
  canToggleMarker?: boolean;
  togglingMarker?: boolean;
  onToggleMarker?: (roundPlayerId: string, isMarker: boolean) => void;
  teamColorMap?: Map<string, number>;
  fullGroupIds?: Set<string>;
}

export function PlayerRow({
  rp,
  userId,
  groups,
  canMoveGroup,
  assigning,
  onAssignToGroup,
  showGroupAssign = true,
  canToggleMarker = false,
  togglingMarker = false,
  onToggleMarker,
  teamColorMap,
  fullGroupIds,
}: PlayerRowProps) {
  const isMe = rp.person.userId === userId;
  const isMarker = rp.isMarker === true;

  const team = rp.player?.teamMemberships?.[0]?.team;
  const teamColorIndex =
    team?.id != null ? teamColorMap?.get(team.id) : undefined;
  const teamColor =
    teamColorIndex !== undefined ? getTeamColor(teamColorIndex) : null;

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
        isMe ? 'border-primary/25 bg-primary/10' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium">
          {rp.person.displayName}
        </span>
        {team && (
          <Badge
            variant="secondary"
            className={cn('shrink-0 text-xs', teamColor?.pillClasses)}
          >
            {team.name}
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {canToggleMarker ? (
          <Button
            variant={isMarker ? 'default' : 'outline'}
            size="icon"
            className="h-7 w-7 rounded-full"
            disabled={togglingMarker}
            onClick={() => onToggleMarker?.(rp.id, !isMarker)}
            title={isMarker ? 'Remove marker role' : 'Assign as marker'}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : isMarker ? (
          <Button
            variant="default"
            size="icon"
            className="pointer-events-none h-7 w-7 rounded-full"
            tabIndex={-1}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        {canMoveGroup &&
          showGroupAssign &&
          (rp.groupId ? (
            <RemoveButton
              label="Remove from group"
              disabled={assigning === rp.id}
              onClick={() => onAssignToGroup(rp.id, null)}
            />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tag>No group</Tag>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {groups.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    disabled={assigning === rp.id || fullGroupIds?.has(g.id)}
                    onClick={() => onAssignToGroup(rp.id, g.id)}
                  >
                    {g.name || `Group ${g.groupNumber}`}
                    {fullGroupIds?.has(g.id) && (
                      <span className="text-muted-foreground ml-auto pl-4 text-xs">
                        Full
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
      </div>
    </div>
  );
}
