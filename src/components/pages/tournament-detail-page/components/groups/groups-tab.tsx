import { useState, useMemo } from 'react';
import {
  useCreateRoundGroup,
  useDeleteRoundGroup,
  useAssignPlayerToGroup,
} from '@/lib/groups';
import { useToggleRoundMarker } from '@/lib/rounds';
import { Plus, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RemoveButton } from '@/components/ui/remove-button';
import { toast } from 'sonner';
import type { RoundData } from '@/types';
import { AutoAssignDialog } from './auto-assign-dialog';
import { PlayerRow } from './components/player-row';

type GroupsTabProps = {
  round: RoundData;
  canEdit: boolean;
  canToggleMarker?: boolean;
  userId: string;
  teamColorMap?: Map<string, number>;
  onChanged: () => void;
};

export function GroupsTab({
  round,
  canEdit,
  canToggleMarker = false,
  userId,
  teamColorMap,
  onChanged,
}: GroupsTabProps) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const [togglingMarker, setTogglingMarker] = useState<string | null>(null);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const [createRoundGroup, { isPending: addingGroup }] = useCreateRoundGroup();
  const [deleteRoundGroup] = useDeleteRoundGroup();
  const [assignPlayerToGroup] = useAssignPlayerToGroup();
  const [toggleRoundMarker] = useToggleRoundMarker();

  const isDraft = round.status === 'draft';
  const canEditGroups = canEdit && isDraft;
  const hasEnoughPlayersForGroups = round.players.length > 4;
  const canConfigureGroups = canEditGroups && hasEnoughPlayersForGroups;
  const showGroups = hasEnoughPlayersForGroups;

  const groups = round.groups ?? [];

  const canAddGroups = canConfigureGroups;

  const byName = (
    a: RoundData['players'][number],
    b: RoundData['players'][number],
  ) =>
    a.person.displayName.localeCompare(b.person.displayName, undefined, {
      sensitivity: 'base',
    });

  const ungrouped = round.players.filter((rp) => !rp.groupId).sort(byName);

  const groupParticipantsMap = useMemo(() => {
    const g = round.groups ?? [];
    const map = new Map<string, RoundData['players']>();
    for (const group of g) {
      map.set(
        group.id,
        round.players.filter((rp) => rp.groupId === group.id).sort(byName),
      );
    }
    return map;
    // byName is a stable inline comparator — no need to list it as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.groups, round.players]);

  const fullGroupIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, members] of groupParticipantsMap) {
      if (members.length >= 4) ids.add(id);
    }
    return ids;
  }, [groupParticipantsMap]);

  const handleAssignToGroup = async (
    roundPlayerId: string,
    groupId: string | null,
  ) => {
    setAssigning(roundPlayerId);
    await assignPlayerToGroup({
      variables: { roundPlayerId, groupId },
      onSuccess: () => onChanged(),
      onError: (error) =>
        toast.error(error.message || 'Failed to assign player'),
    });
    setAssigning(null);
  };
  const handleAddGroup = async () => {
    const nextNumber =
      groups.length > 0 ? Math.max(...groups.map((g) => g.groupNumber)) + 1 : 1;
    await createRoundGroup({
      variables: {
        roundId: round.id,
        groupNumber: nextNumber,
        name: `Group ${nextNumber}`,
      },
      onSuccess: () => {
        toast.success('Group added.');
        onChanged();
      },
      onError: (error) => toast.error(error.message || 'Failed to add group'),
    });
  };

  const handleDeleteGroup = async (groupId: string) => {
    setDeletingGroupId(groupId);
    await deleteRoundGroup({
      variables: { groupId },
      onSuccess: () => {
        toast.success('Group deleted.');
        onChanged();
      },
      onError: (error) =>
        toast.error(error.message || 'Failed to delete group'),
    });
    setDeletingGroupId(null);
  };

  const handleToggleMarker = async (
    roundParticipantId: string,
    isMarker: boolean,
  ) => {
    setTogglingMarker(roundParticipantId);
    await toggleRoundMarker({
      variables: { roundPlayerId: roundParticipantId, isMarker },
      onSuccess: () => onChanged(),
      onError: (error) =>
        toast.error(error.message || 'Failed to update marker'),
    });
    setTogglingMarker(null);
  };

  if (round.players.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No players in this round.</p>
    );
  }

  const groupsFooter = canAddGroups ? (
    <div className="flex justify-end gap-2 border-t pt-3">
      <Button
        variant="secondary"
        size="icon-sm"
        className="rounded-full"
        aria-label="Auto-assign groups"
        disabled={round.players.length === 0}
        onClick={() => setAutoAssignOpen(true)}
      >
        <Shuffle />
      </Button>
      <Button
        size="icon-sm"
        className="rounded-full"
        aria-label="Add group"
        disabled={addingGroup}
        onClick={handleAddGroup}
      >
        <Plus />
      </Button>
    </div>
  ) : null;

  if (!showGroups || groups.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          {showGroups
            ? 'No groups configured yet.'
            : 'Add more than 4 players to enable groups.'}
        </p>
        {groupsFooter}

        <AutoAssignDialog
          open={autoAssignOpen}
          roundId={round.id}
          participantsCount={round.players.length}
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
      {groups.map((group) => {
        const members = groupParticipantsMap.get(group.id) ?? [];
        return (
          <div key={group.id} className="overflow-hidden rounded-xl border">
            <div className="bg-muted flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {group.name || `Group ${group.groupNumber}`}
                </span>
                <Badge
                  variant="outline"
                  className="bg-background/70 tabular-nums"
                >
                  {members.length}
                </Badge>
              </div>
              {canEditGroups && (
                <RemoveButton
                  label={`Delete ${group.name || `Group ${group.groupNumber}`}`}
                  disabled={deletingGroupId === group.id}
                  onClick={() => handleDeleteGroup(group.id)}
                />
              )}
            </div>
            <div className="space-y-1 p-2">
              {members.length === 0 ? (
                <p className="text-muted-foreground px-2 py-1 text-sm">
                  No players assigned.
                </p>
              ) : (
                members.map((rp) => (
                  <PlayerRow
                    key={rp.id}
                    rp={rp}
                    userId={userId}
                    groups={groups}
                    canMoveGroup={canConfigureGroups && groups.length > 0}
                    assigning={assigning}
                    onAssignToGroup={handleAssignToGroup}
                    canToggleMarker={canToggleMarker}
                    togglingMarker={togglingMarker === rp.id}
                    onToggleMarker={handleToggleMarker}
                    teamColorMap={teamColorMap}
                    fullGroupIds={fullGroupIds}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div className="bg-muted flex items-center gap-2 px-3 py-2">
            <span className="text-muted-foreground text-sm font-semibold">
              Unassigned
            </span>
            <Badge variant="outline" className="bg-background/70 tabular-nums">
              {ungrouped.length}
            </Badge>
          </div>
          <div className="space-y-1 p-2">
            {ungrouped.map((rp) => (
              <PlayerRow
                key={rp.id}
                rp={rp}
                userId={userId}
                groups={groups}
                canMoveGroup={canConfigureGroups && groups.length > 0}
                assigning={assigning}
                onAssignToGroup={handleAssignToGroup}
                canToggleMarker={canToggleMarker}
                togglingMarker={togglingMarker === rp.id}
                onToggleMarker={handleToggleMarker}
                teamColorMap={teamColorMap}
                fullGroupIds={fullGroupIds}
              />
            ))}
          </div>
        </div>
      )}

      {groupsFooter}

      <AutoAssignDialog
        open={autoAssignOpen}
        roundId={round.id}
        participantsCount={round.players.length}
        onClose={() => setAutoAssignOpen(false)}
        onAssigned={() => {
          setAutoAssignOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}
