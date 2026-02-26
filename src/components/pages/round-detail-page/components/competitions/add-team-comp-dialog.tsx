import { useState, useMemo } from 'react';
import { useCreateCompetition } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
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
import type { RoundData, RoundCompetitionsData } from '../types';
import { PointsFields } from './competition-fields/points-fields';

export function AddTeamCompDialog({
  tournamentId,
  roundId,
  round,
  competitions,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  round: RoundData;
  competitions: RoundCompetitionsData;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [createCompetition, { isPending: saving }] = useCreateCompetition();
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('match_play');

  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const hasMatchPlayComp = competitions.some(
    (c) => c.formatType === 'match_play',
  );

  const getFormatLabel = () => {
    return (
      TEAM_FORMATS.find((f) => f.value === formatType)?.label ?? formatType
    );
  };

  const resetForm = () => {
    setFormatType('match_play');
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
  };

  const bestBallPairings = useMemo(() => {
    const pairings: { teamA: string; teamB: string }[] = [];
    for (const group of round.groups ?? []) {
      const groupParticipants = round.participants.filter(
        (rp) => rp.roundGroupId === group.id,
      );
      const teamCounts = new Map<string, number>();
      for (const rp of groupParticipants) {
        const teamId = rp.tournamentParticipant?.teamMemberships?.[0]?.team?.id;
        if (teamId) {
          teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
        }
      }
      const teamIds = [...teamCounts.keys()];
      if (
        teamIds.length === 2 &&
        teamCounts.get(teamIds[0]) === 2 &&
        teamCounts.get(teamIds[1]) === 2
      ) {
        pairings.push({ teamA: teamIds[0], teamB: teamIds[1] });
      }
    }
    return pairings;
  }, [round.groups, round.participants]);

  const validBestBallGroups = useMemo(() => {
    let count = 0;
    for (const group of round.groups ?? []) {
      const groupParticipants = round.participants.filter(
        (rp) => rp.roundGroupId === group.id,
      );
      const teamCounts = new Map<string, number>();
      for (const rp of groupParticipants) {
        const teamId = rp.tournamentParticipant?.teamMemberships?.[0]?.team?.id;
        if (teamId) {
          teamCounts.set(teamId, (teamCounts.get(teamId) ?? 0) + 1);
        }
      }
      const teamIds = [...teamCounts.keys()];
      if (
        teamIds.length === 2 &&
        teamCounts.get(teamIds[0]) === 2 &&
        teamCounts.get(teamIds[1]) === 2
      ) {
        count++;
      }
    }
    return count;
  }, [round.groups, round.participants]);

  /** Valid Hi-Lo groups: exactly 2 teams with exactly 2 players each per group */
  const validHiLoGroups = validBestBallGroups;

  /** Valid Rumble groups: exactly 4 players from the same team per group */
  const validRumbleGroups = useMemo(() => {
    let count = 0;
    for (const group of round.groups ?? []) {
      const groupParticipants = round.participants.filter(
        (rp) => rp.roundGroupId === group.id,
      );
      if (groupParticipants.length !== 4) continue;
      const teams = new Set(
        groupParticipants
          .map((rp) => rp.tournamentParticipant?.teamMemberships?.[0]?.team?.id)
          .filter(Boolean),
      );
      if (teams.size === 1) count++;
    }
    return count;
  }, [round.groups, round.participants]);

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'match_play':
        return {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
      case 'best_ball':
        return {
          formatType: 'best_ball',
          config: { pointsPerWin, pointsPerHalf, pairings: bestBallPairings },
        };
      case 'hi_lo':
        return {
          formatType: 'hi_lo',
          config: { pointsPerWin, pointsPerHalf },
        };
      case 'rumble':
        return {
          formatType: 'rumble',
          config: { pointsPerWin },
        };
      default:
        return {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
    }
  };

  const isDisabled = () => {
    if (saving) return true;
    if (formatType === 'match_play' && hasMatchPlayComp) return true;
    if (formatType === 'best_ball' && validBestBallGroups === 0) return true;
    if (formatType === 'hi_lo' && validHiLoGroups === 0) return true;
    if (formatType === 'rumble' && validRumbleGroups === 0) return true;
    return false;
  };

  const groupScope = (): 'all' | 'within_group' => {
    if (
      formatType === 'best_ball' ||
      formatType === 'hi_lo' ||
      formatType === 'rumble'
    )
      return 'within_group';
    return 'all';
  };

  const handleSave = async () => {
    await createCompetition({
      variables: {
        tournamentId,
        name: getFormatLabel(),
        competitionCategory: 'match',
        groupScope: groupScope(),
        roundId,
        competitionConfig: buildConfig(),
      },
      onSuccess: () => {
        toast.success('Competition created.');
        setOpen(false);
        resetForm();
        onSaved();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
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
        <Button variant="outline" size="sm">
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
                setFormatType(e.target.value as CompetitionConfig['formatType'])
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

          {/* Match Play */}
          {formatType === 'match_play' && (
            <div className="space-y-3">
              {hasMatchPlayComp && (
                <p className="text-destructive text-xs">
                  A Singles competition already exists for this round. Only one
                  is allowed.
                </p>
              )}
              <PointsFields
                pointsPerWin={pointsPerWin}
                pointsPerHalf={pointsPerHalf}
                onPointsPerWinChange={setPointsPerWin}
                onPointsPerHalfChange={setPointsPerHalf}
              />
              <p className="text-muted-foreground text-xs">
                Pairings are configured in the Pairings tab.
              </p>
            </div>
          )}

          {/* Best Ball */}
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

          {/* Hi-Lo */}
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

          {/* Rumble */}
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
