import { useState, useMemo } from 'react';
import { useCreateGame } from '@/lib/games';
import type { GameConfig } from '@/lib/games';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import { TEAM_FORMATS } from '../constants';
import type { RoundData, RoundGamesData } from '../types';
import { PointsFields } from './competition-fields/points-fields';

export function AddTeamCompDialog({
  tournamentId,
  roundId,
  round,
  games,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  round: RoundData;
  games: RoundGamesData;
  onSaved: () => void;
  disabled?: boolean;
}) {
  const disabledProp = (arguments[0] as any).disabled as boolean | undefined;
  const [open, setOpen] = useState(false);
  const [createGame] = useCreateGame();
  const [saving, setSaving] = useState(false);
  const [formatType, setFormatType] =
    useState<GameConfig['formatType']>('best_ball');

  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);
  const [rumbleScoringBasis, setRumbleScoringBasis] = useState<
    'stableford' | 'net' | 'gross'
  >('stableford');

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const groups = round.groups ?? [];

  const getFormatLabel = () => {
    return (
      TEAM_FORMATS.find((f) => f.value === formatType)?.label ?? formatType
    );
  };

  const resetForm = () => {
    setFormatType('best_ball');
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
    setRumbleScoringBasis('stableford');
    setSelectedGroupId('');
  };

  const bestBallGroupPairings = useMemo(() => {
    const result = new Map<string, { teamA: string; teamB: string }>();

    for (const group of groups) {
      const pool = round.players.filter((rp) => rp.groupId === group.id);
      const teamCounts = new Map<string, number>();
      for (const rp of pool) {
        const teamId = rp.player?.teamMemberships?.[0]?.team?.id;
        if (teamId) teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
      }
      const teamIds = [...teamCounts.keys()];
      if (
        teamIds.length === 2 &&
        teamCounts.get(teamIds[0]) === 2 &&
        teamCounts.get(teamIds[1]) === 2
      ) {
        result.set(group.id, { teamA: teamIds[0]!, teamB: teamIds[1]! });
      }
    }

    return result;
  }, [groups, round.players]);

  const validBestBallGroupIds = useMemo(
    () => [...bestBallGroupPairings.keys()],
    [bestBallGroupPairings],
  );
  const validBestBallGroups = validBestBallGroupIds.length;

  const hiLoGroupIds = useMemo(() => {
    const result: string[] = [];
    for (const group of groups) {
      const pool = round.players.filter((rp) => rp.groupId === group.id);
      const teamCounts = new Map<string, number>();
      for (const rp of pool) {
        const teamId = rp.player?.teamMemberships?.[0]?.team?.id;
        if (teamId) teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
      }
      const teamIds = [...teamCounts.keys()];
      if (
        teamIds.length === 2 &&
        teamCounts.get(teamIds[0]) === 2 &&
        teamCounts.get(teamIds[1]) === 2
      ) {
        result.push(group.id);
      }
    }
    return result;
  }, [groups, round.players]);
  const validHiLoGroups = hiLoGroupIds.length;

  const rumbleGroupIds = useMemo(() => {
    const result: string[] = [];
    for (const group of groups) {
      const pool = round.players.filter((rp) => rp.groupId === group.id);
      if (pool.length !== 4) continue;
      const teams = new Set(
        pool
          .map((rp) => rp.player?.teamMemberships?.[0]?.team?.id)
          .filter(Boolean),
      );
      if (teams.size === 1) result.push(group.id);
    }
    return result;
  }, [groups, round.players]);
  const validRumbleGroups = rumbleGroupIds.length;

  const hasMatchPlayCompInGroup = (groupId: string) =>
    games.some((g) => g.format === 'match_play' && g.groupId === groupId);

  const buildConfig = (groupId: string): GameConfig => {
    switch (formatType) {
      case 'best_ball': {
        const pairing = bestBallGroupPairings.get(groupId);
        return {
          formatType: 'best_ball',
          config: {
            pointsPerWin,
            pointsPerHalf,
            pairings: pairing ? [pairing] : [],
          },
        };
      }
      case 'hi_lo':
        return {
          formatType: 'hi_lo',
          config: { pointsPerWin, pointsPerHalf },
        };
      case 'rumble':
        return {
          formatType: 'rumble',
          config: { pointsPerWin, scoringBasis: rumbleScoringBasis },
        };
      case 'match_play':
        return {
          formatType: 'match_play',
          config: {
            scoringBasis: 'stableford',
            pointsPerWin,
            pointsPerHalf,
            pairings: [],
          },
        };
      default:
        return {
          formatType: 'best_ball',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
    }
  };

  const isDisabled = () => {
    if (saving) return true;
    if (formatType === 'best_ball' && validBestBallGroups === 0) return true;
    if (formatType === 'hi_lo' && validHiLoGroups === 0) return true;
    if (formatType === 'rumble' && validRumbleGroups === 0) return true;
    if (formatType === 'match_play') {
      if (!selectedGroupId) return true;
      if (hasMatchPlayCompInGroup(selectedGroupId)) return true;
    }
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (formatType === 'match_play') {
        if (!selectedGroupId) return;
        await createGame({
          variables: {
            tournamentId,
            roundId,
            groupId: selectedGroupId,
            name: getFormatLabel(),
            gameConfig: buildConfig(selectedGroupId),
          },
          onError: (error) => {
            toast.error(error.message);
          },
        });
      } else {
        const validGroupIds =
          formatType === 'best_ball'
            ? validBestBallGroupIds
            : formatType === 'hi_lo'
              ? hiLoGroupIds
              : formatType === 'rumble'
                ? rumbleGroupIds
                : [];

        let failed = false;
        for (const groupId of validGroupIds) {
          await createGame({
            variables: {
              tournamentId,
              roundId,
              groupId,
              name: getFormatLabel(),
              gameConfig: buildConfig(groupId),
            },
            onError: (error) => {
              toast.error(error.message);
              failed = true;
            },
          });
          if (failed) return;
        }
      }

      toast.success('Competition created.');
      setOpen(false);
      resetForm();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabledProp}>
          + Team Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Match Competition</DialogTitle>
          <DialogDescription>
            Create a competition scored between teams.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-comp-format">Format</Label>
            <Select
              id="team-comp-format"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as GameConfig['formatType'])
              }
              autoFocus
            >
              {TEAM_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
          </div>

          {formatType === 'best_ball' && (
            <div className="space-y-3">
              <PointsFields
                pointsPerWin={pointsPerWin}
                pointsPerHalf={pointsPerHalf}
                onPointsPerWinChange={setPointsPerWin}
                onPointsPerHalfChange={setPointsPerHalf}
              />
              {validBestBallGroups > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {validBestBallGroups} group
                  {validBestBallGroups !== 1 ? 's' : ''} with valid 2v2 team
                  matchups. Pairings will be set up automatically.
                </p>
              ) : (
                <p className="text-destructive text-xs">
                  No groups have a valid 2v2 setup (exactly 2 teams with 2
                  players each). Set up groups and teams first.
                </p>
              )}
            </div>
          )}

          {formatType === 'hi_lo' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                2v2 per group. Each hole: High ball match + Low ball match — 2
                points available per hole.
              </p>
              <PointsFields
                pointsPerWin={pointsPerWin}
                pointsPerHalf={pointsPerHalf}
                onPointsPerWinChange={setPointsPerWin}
                onPointsPerHalfChange={setPointsPerHalf}
              />
              {validHiLoGroups > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {validHiLoGroups} group
                  {validHiLoGroups !== 1 ? 's' : ''} with valid 2v2 matchups.
                </p>
              ) : (
                <p className="text-destructive text-xs">
                  No groups have a valid 2v2 setup (exactly 2 teams with 2
                  players each). Set up groups and teams first.
                </p>
              )}
            </div>
          )}

          {formatType === 'rumble' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                4-player groups (same team). Holes 1–6: best 1; Holes 7–12: top
                2; Holes 13–17: top 3; Hole 18: all 4. Higher team total wins.
              </p>
              <div className="space-y-2">
                <Label>Points per Win</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={pointsPerWin}
                  onChange={(e) =>
                    setPointsPerWin(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Scoring Basis</Label>
                <Select
                  value={rumbleScoringBasis}
                  onChange={(e) =>
                    setRumbleScoringBasis(
                      e.target.value as 'stableford' | 'net' | 'gross',
                    )
                  }
                >
                  <option value="stableford">Stableford Points</option>
                  <option value="net">Net Strokes</option>
                  <option value="gross">Gross Strokes</option>
                </Select>
              </div>
              {validRumbleGroups > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {validRumbleGroups} group
                  {validRumbleGroups !== 1 ? 's' : ''} with 4 same-team players.
                </p>
              ) : (
                <p className="text-destructive text-xs">
                  No groups have 4 players from the same team. Set up groups and
                  teams first.
                </p>
              )}
            </div>
          )}

          {formatType === 'match_play' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="match-play-group">Group</Label>
                <Select
                  id="match-play-group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a group…
                  </option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name ?? `Group ${g.groupNumber}`}
                    </option>
                  ))}
                </Select>
              </div>
              {selectedGroupId && hasMatchPlayCompInGroup(selectedGroupId) && (
                <p className="text-destructive text-xs">
                  This group already has a Singles competition.
                </p>
              )}
              <PointsFields
                pointsPerWin={pointsPerWin}
                pointsPerHalf={pointsPerHalf}
                onPointsPerWinChange={setPointsPerWin}
                onPointsPerHalfChange={setPointsPerHalf}
              />
              <p className="text-muted-foreground text-xs">
                Pairings are configured using Configure Matches after creation.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isDisabled()}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
