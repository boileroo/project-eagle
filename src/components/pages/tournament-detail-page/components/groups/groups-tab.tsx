import { useState, useMemo } from 'react';
import {
  createRoundGroupFn,
  deleteRoundGroupFn,
  assignParticipantToGroupFn,
} from '@/lib/groups.server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { RoundData } from '@/components/round-detail/types';
import { AutoAssignDialog } from './auto-assign-dialog';

type GroupsTabProps = {
  round: RoundData;
  canEdit: boolean;
  userId: string;
  onChanged: () => void;
};

export function GroupsTab({
  round,
  canEdit,
  userId,
  onChanged,
}: GroupsTabProps) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const isDraft = round.status === 'draft';
  const canEditGroups = canEdit && isDraft;
  const hasEnoughPlayersForGroups = round.participants.length > 4;
  const canConfigureGroups = canEditGroups && hasEnoughPlayersForGroups;
  const showGroups = hasEnoughPlayersForGroups;

  const ungrouped = round.participants.filter((rp) => !rp.roundGroupId);
  const groups = round.groups ?? [];

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
        <AutoAssignDialog
          open={autoAssignOpen}
          roundId={round.id}
          participantsCount={round.participants.length}
          onClose={() => setAutoAssignOpen(false)}
          onAssigned={() => {
            setAutoAssignOpen(false);
            onChanged();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <AutoAssignDialog
        open={autoAssignOpen}
        roundId={round.id}
        participantsCount={round.participants.length}
        onClose={() => setAutoAssignOpen(false)}
        onAssigned={() => {
          setAutoAssignOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}
