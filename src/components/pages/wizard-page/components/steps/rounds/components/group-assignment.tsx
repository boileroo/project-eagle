import type { WizardPlayer } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WizardGroup {
  name?: string;
  playerIndices: number[];
}

interface GroupAssignmentProps {
  players: WizardPlayer[];
  groups: WizardGroup[];
  onChange: (groups: WizardGroup[]) => void;
}

export function autoAssign(
  players: WizardPlayer[],
  groupCount: number,
): WizardGroup[] {
  return Array.from({ length: groupCount }, (_, gi) => ({
    name: groupCount > 1 ? `Group ${gi + 1}` : undefined,
    playerIndices: players
      .map((_, pi) => pi)
      .filter((pi) => pi % groupCount === gi),
  }));
}

export function GroupAssignment({
  players,
  groups,
  onChange,
}: GroupAssignmentProps) {
  const addGroup = () => {
    onChange([
      ...groups,
      {
        name: `Group ${groups.length + 1}`,
        playerIndices: [],
      },
    ]);
  };

  const removeGroup = (groupIndex: number) => {
    const removed = groups[groupIndex];
    const next = groups
      .filter((_, i) => i !== groupIndex)
      .map((g) => ({
        ...g,
        playerIndices: g.playerIndices.filter(
          (pi: number) => !removed.playerIndices.includes(pi),
        ),
      }));
    onChange(next);
  };

  const handleGroupNameChange = (groupIndex: number, name: string) => {
    onChange(groups.map((g, i) => (i === groupIndex ? { ...g, name } : g)));
  };

  const handlePlayerAssign = (
    playerIndex: number,
    groupIndex: number | null,
  ) => {
    const next = groups.map((group, i) => {
      const filtered = group.playerIndices.filter(
        (pi: number) => pi !== playerIndex,
      );
      if (i === groupIndex) {
        return { ...group, playerIndices: [...filtered, playerIndex] };
      }
      return { ...group, playerIndices: filtered };
    });
    onChange(next);
  };

  const getPlayerGroup = (playerIndex: number): number | null => {
    const idx = groups.findIndex((g) => g.playerIndices.includes(playerIndex));
    return idx === -1 ? null : idx;
  };

  const handleAutoAssign = () => {
    onChange(autoAssign(players, Math.max(1, groups.length)));
  };

  if (groups.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          All players will be in a single group by default.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          Split into groups
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Groups</span>
        {groups.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoAssign}
          >
            Auto-assign
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          Add Group
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
        >
          Remove groups
        </Button>
      </div>

      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="rounded-md border p-3">
          <div className="mb-2 flex items-center gap-2">
            <Input
              value={group.name ?? ''}
              onChange={(e) =>
                handleGroupNameChange(groupIndex, e.target.value)
              }
              placeholder={`Group ${groupIndex + 1}`}
              className="h-8 w-40 text-sm"
            />
            {groups.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeGroup(groupIndex)}
              >
                Remove
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((player, playerIndex) => {
              const assignedGroup = getPlayerGroup(playerIndex);
              const isAssigned = assignedGroup === groupIndex;
              return (
                <button
                  key={playerIndex}
                  type="button"
                  onClick={() =>
                    handlePlayerAssign(
                      playerIndex,
                      isAssigned ? null : groupIndex,
                    )
                  }
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    isAssigned
                      ? 'border-primary bg-primary/10 text-primary'
                      : assignedGroup !== null
                        ? 'border-border text-muted-foreground opacity-50'
                        : 'border-border hover:bg-muted',
                  ].join(' ')}
                >
                  {player.displayName}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
