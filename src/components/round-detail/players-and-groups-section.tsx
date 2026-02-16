import { useState, useMemo } from 'react';
import {
  removeRoundParticipantFn,
} from '@/lib/rounds.server';
import {
  createRoundGroupFn,
  deleteRoundGroupFn,
  assignParticipantToGroupFn,
  autoAssignGroupsFn,
} from '@/lib/groups.server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { EditRoundHandicapDialog } from './edit-round-handicap-dialog';
import type { RoundData } from './types';

export function PlayersAndGroupsSection({
  round,
  isCommissioner,
  onChanged,
}: {
  round: RoundData;
  isCommissioner: boolean;
  onChanged: () => void;
}) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [autoAssignSize, setAutoAssignSize] = useState(4);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const isDraft = round.status === 'draft';
  const canEditGroups = isCommissioner && isDraft;
  const showGroups = round.participants.length > 4;

  const ungrouped = round.participants.filter((rp) => !rp.roundGroupId);
  const groups = round.groups ?? [];

  const groupParticipantsMap = useMemo(() => {
    const map = new Map<string, RoundData['participants']>();
    for (const g of groups) {
      map.set(
        g.id,
        round.participants.filter((rp) => rp.roundGroupId === g.id),
      );
    }
    return map;
  }, [groups, round.participants]);

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

  const handleRemoveParticipant = async (rpId: string, name: string) => {
    try {
      await removeRoundParticipantFn({ data: { roundParticipantId: rpId } });
      toast.success(`${name} removed from round.`);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove participant',
      );
    }
  };

  const PlayerRow = ({
    rp,
    showGroupAssign = true,
  }: {
    rp: RoundData['participants'][number];
    showGroupAssign?: boolean;
  }) => (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{rp.person.displayName}</span>
        {rp.person.userId == null && (
          <Badge variant="outline" className="text-xs">
            Guest
          </Badge>
        )}
        {rp.tournamentParticipant?.teamMemberships?.[0]?.team && (
          <Badge variant="secondary" className="text-xs">
            {rp.tournamentParticipant.teamMemberships[0].team.name}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          HC {rp.handicapOverride ?? rp.handicapSnapshot}
        </Badge>
        {rp.handicapOverride && (
          <span className="text-muted-foreground text-xs">
            (snap: {rp.handicapSnapshot})
          </span>
        )}
        {round.status === 'draft' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                ⋯
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <EditRoundHandicapDialog
                roundParticipant={rp}
                onSaved={onChanged}
              />
              {showGroupAssign &&
                canEditGroups &&
                showGroups &&
                groups.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
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
                  </>
                )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  handleRemoveParticipant(rp.id, rp.person.displayName)
                }
              >
                Remove from Round
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{showGroups ? 'Players & Groups' : 'Players'}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {round.participants.length} player
              {round.participants.length !== 1 ? 's' : ''}
            </Badge>
            {canEditGroups && showGroups && (
              <>
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
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {round.participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No players in this round.
          </p>
        ) : !showGroups || groups.length === 0 ? (
          <div className="space-y-2">
            {round.participants.map((rp) => (
              <PlayerRow key={rp.id} rp={rp} showGroupAssign={false} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
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
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
