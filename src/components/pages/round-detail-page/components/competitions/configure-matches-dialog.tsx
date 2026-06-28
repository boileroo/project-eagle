import { useState, useMemo } from 'react';
import { useUpdateGame } from '@/lib/games';
import type { GameConfig } from '@/lib/games';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { RoundData, RoundGamesData } from '../types';

export function ConfigureMatchesDialog({
  comp,
  players,
  groups,
  onSaved,
}: {
  comp: RoundGamesData[number];
  players: RoundData['players'];
  groups: RoundData['groups'];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [updateGame, { isPending: saving }] = useUpdateGame();

  const existingConfig = (comp.config ?? {}) as Record<string, unknown>;
  const existingPairings: { playerA: string; playerB: string }[] =
    (existingConfig?.pairings as
      | { playerA: string; playerB: string }[]
      | undefined) ?? [];

  const [pairings, setPairings] = useState(existingPairings);

  const [addState, setAddState] = useState<
    Record<string, { playerA: string; playerB: string }>
  >({});

  const getAddState = (groupId: string) =>
    addState[groupId] ?? { playerA: '', playerB: '' };

  const setGroupPlayerA = (groupId: string, value: string) =>
    setAddState((prev) => ({
      ...prev,
      [groupId]: { ...getAddState(groupId), playerA: value },
    }));

  const setGroupPlayerB = (groupId: string, value: string) =>
    setAddState((prev) => ({
      ...prev,
      [groupId]: { ...getAddState(groupId), playerB: value },
    }));

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of pairings) {
      ids.add(p.playerA);
      ids.add(p.playerB);
    }
    return ids;
  }, [pairings]);

  const getPlayerName = (rpId: string) =>
    players.find((rp) => rp.id === rpId)?.person.displayName ?? 'Unknown';

  const getPlayerTeam = (rpId: string) => {
    const rp = players.find((p) => p.id === rpId);
    return rp?.player?.teamMemberships?.[0]?.team?.name ?? null;
  };

  const getPlayerTeamId = (rpId: string) => {
    const rp = players.find((p) => p.id === rpId);
    return rp?.player?.teamMemberships?.[0]?.team?.id ?? null;
  };

  const getPairingsForGroup = (groupId: string) => {
    if (groupId === UNGROUPED_ID) {
      return pairings.map((p, i) => ({ ...p, index: i }));
    }
    const groupMemberIds = new Set(
      players.filter((rp) => rp.groupId === groupId).map((rp) => rp.id),
    );
    return pairings
      .map((p, i) => ({ ...p, index: i }))
      .filter(
        (p) => groupMemberIds.has(p.playerA) || groupMemberIds.has(p.playerB),
      );
  };

  const getAvailableInGroup = (groupId: string) => {
    if (groupId === UNGROUPED_ID) {
      return players.filter((rp) => !assignedIds.has(rp.id));
    }
    return players.filter(
      (rp) => rp.groupId === groupId && !assignedIds.has(rp.id),
    );
  };

  const getGroupTeamIds = (groupId: string): [string, string] | [] => {
    const groupPlayers =
      groupId === UNGROUPED_ID
        ? players
        : players.filter((p) => p.groupId === groupId);
    const seen = new Map<string, boolean>();
    for (const rp of groupPlayers) {
      const teamId = rp.player?.teamMemberships?.[0]?.team?.id ?? null;
      if (teamId && !seen.has(teamId)) seen.set(teamId, true);
    }
    const ids = [...seen.keys()];
    return ids.length === 2 ? [ids[0], ids[1]] : [];
  };

  const handleAddPairing = (groupId: string) => {
    const { playerA, playerB } = getAddState(groupId);
    if (!playerA || !playerB || playerA === playerB) return;
    setPairings((prev) => [...prev, { playerA, playerB }]);
    setAddState((prev) => ({
      ...prev,
      [groupId]: { playerA: '', playerB: '' },
    }));
  };

  const handleRemovePairing = (index: number) => {
    setPairings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const config: GameConfig = {
      formatType: comp.format as GameConfig['formatType'],
      config: {
        ...existingConfig,
        pairings,
      },
    } as GameConfig;

    await updateGame({
      variables: {
        id: comp.id,
        gameConfig: config,
      },
      onSuccess: () => {
        toast.success('Matches configured.');
        setOpen(false);
        onSaved();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setPairings(existingPairings);
      setAddState({});
    }
    setOpen(next);
  };

  const UNGROUPED_ID = '__ungrouped__';

  const hasRealGroups = groups.length > 0;

  const effectiveGroups: {
    id: string;
    groupNumber: number;
    name: string | null;
  }[] = hasRealGroups
    ? groups
    : players.length >= 2
      ? [{ id: UNGROUPED_ID, groupNumber: 1, name: 'All Players' }]
      : [];

  const hasGroups = effectiveGroups.length > 0;

  const getGroupMemberCount = (groupId: string) => {
    if (groupId === UNGROUPED_ID) return players.length;
    return players.filter((rp) => rp.groupId === groupId).length;
  };

  const ungroupedPlayers = hasRealGroups
    ? players.filter((rp) => !rp.groupId && !assignedIds.has(rp.id))
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          Configure Matches
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Matches</DialogTitle>
          <DialogDescription>
            Set up head-to-head pairings for {comp.name}.
            {hasRealGroups
              ? ' Pairings are organised by group.'
              : ' Pair players below.'}
          </DialogDescription>
        </DialogHeader>

        {!hasGroups ? (
          <p className="text-muted-foreground py-2 text-sm">
            Add at least two players to configure matches.
          </p>
        ) : (
          <div className="space-y-5">
            {effectiveGroups.map((group) => {
              const groupPairings = getPairingsForGroup(group.id);
              const available = getAvailableInGroup(group.id);
              const { playerA, playerB } = getAddState(group.id);

              return (
                <div key={group.id} className="space-y-2 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {group.name || `Group ${group.groupNumber}`}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getGroupMemberCount(group.id)} players
                    </Badge>
                  </div>

                  {groupPairings.length > 0 && (
                    <div className="space-y-1">
                      {groupPairings.map((pairing) => {
                        const teamA = getPlayerTeam(pairing.playerA);
                        const teamB = getPlayerTeam(pairing.playerB);
                        return (
                          <div
                            key={pairing.index}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">
                                {getPlayerName(pairing.playerA)}
                              </span>
                              {teamA && (
                                <Badge variant="secondary" className="text-xs">
                                  {teamA}
                                </Badge>
                              )}
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium">
                                {getPlayerName(pairing.playerB)}
                              </span>
                              {teamB && (
                                <Badge variant="secondary" className="text-xs">
                                  {teamB}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-6 text-xs"
                              onClick={() => handleRemovePairing(pairing.index)}
                            >
                              ✕
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {available.length >= 2 ? (
                    <div className="flex items-end gap-2">
                      {(() => {
                        const teamIds = getGroupTeamIds(group.id);
                        const hasTeamSplit = teamIds.length === 2;
                        const teamAId = hasTeamSplit ? teamIds[0] : null;
                        const teamBId = hasTeamSplit ? teamIds[1] : null;

                        const availableForA = available.filter((rp) => {
                          if (rp.id === playerB) return false;
                          if (teamAId) {
                            const rpTeamId =
                              rp.player?.teamMemberships?.[0]?.team?.id ?? null;
                            return rpTeamId === teamAId;
                          }
                          if (playerB) {
                            const selectedTeamId = getPlayerTeamId(playerB);
                            const rpTeamId =
                              rp.player?.teamMemberships?.[0]?.team?.id ?? null;
                            if (
                              selectedTeamId &&
                              rpTeamId &&
                              selectedTeamId === rpTeamId
                            )
                              return false;
                          }
                          return true;
                        });

                        const availableForB = available.filter((rp) => {
                          if (rp.id === playerA) return false;
                          if (teamBId) {
                            const rpTeamId =
                              rp.player?.teamMemberships?.[0]?.team?.id ?? null;
                            return rpTeamId === teamBId;
                          }
                          if (playerA) {
                            const selectedTeamId = getPlayerTeamId(playerA);
                            const rpTeamId =
                              rp.player?.teamMemberships?.[0]?.team?.id ?? null;
                            if (
                              selectedTeamId &&
                              rpTeamId &&
                              selectedTeamId === rpTeamId
                            )
                              return false;
                          }
                          return true;
                        });

                        return (
                          <>
                            <div className="flex-1">
                              <Select
                                className="h-9 px-2"
                                value={playerA}
                                onChange={(e) =>
                                  setGroupPlayerA(group.id, e.target.value)
                                }
                              >
                                <option value="" disabled>
                                  Player A
                                </option>
                                {availableForA.map((rp) => {
                                  const team =
                                    rp.player?.teamMemberships?.[0]?.team?.name;
                                  return (
                                    <option key={rp.id} value={rp.id}>
                                      {rp.person.displayName}
                                      {team ? ` (${team})` : ''}
                                    </option>
                                  );
                                })}
                              </Select>
                            </div>
                            <span className="text-muted-foreground pb-2 text-sm">
                              vs
                            </span>
                            <div className="flex-1">
                              <Select
                                className="h-9 px-2"
                                value={playerB}
                                onChange={(e) =>
                                  setGroupPlayerB(group.id, e.target.value)
                                }
                              >
                                <option value="" disabled>
                                  Player B
                                </option>
                                {availableForB.map((rp) => {
                                  const team =
                                    rp.player?.teamMemberships?.[0]?.team?.name;
                                  return (
                                    <option key={rp.id} value={rp.id}>
                                      {rp.person.displayName}
                                      {team ? ` (${team})` : ''}
                                    </option>
                                  );
                                })}
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9"
                              disabled={
                                !playerA || !playerB || playerA === playerB
                              }
                              onClick={() => handleAddPairing(group.id)}
                            >
                              Add
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  ) : groupPairings.length > 0 && available.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      All players in this group are paired.
                    </p>
                  ) : available.length === 1 ? (
                    <p className="text-muted-foreground text-xs">
                      1 player remaining without a match.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No players in this group.
                    </p>
                  )}
                </div>
              );
            })}

            {ungroupedPlayers.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {ungroupedPlayers.length} player
                {ungroupedPlayers.length !== 1 ? 's' : ''} not assigned to a
                group. Assign them to a group to configure matches.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
