import { useState, useMemo } from 'react';
import { createCompetitionFn } from '@/lib/competitions.server';
import type { CompetitionConfig } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { TEAM_FORMATS } from './constants';
import type { RoundData } from './types';

export function AddTeamCompDialog({
  tournamentId,
  roundId,
  round,
  onSaved,
}: {
  tournamentId: string;
  roundId: string;
  round: RoundData;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('match_play');

  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const resetForm = () => {
    setName('');
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
      default:
        return {
          formatType: 'match_play',
          config: { pointsPerWin, pointsPerHalf, pairings: [] },
        };
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Competition name is required.');
      return;
    }
    setSaving(true);
    try {
      await createCompetitionFn({
        data: {
          tournamentId,
          name: name.trim(),
          participantType: 'team',
          groupScope: 'all',
          roundId,
          competitionConfig: buildConfig(),
        },
      });
      toast.success('Competition created.');
      setOpen(false);
      resetForm();
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create competition',
      );
    }
    setSaving(false);
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
          + Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Competition</DialogTitle>
          <DialogDescription>
            Create a competition scored between teams.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-comp-name">Name</Label>
            <Input
              id="team-comp-name"
              placeholder="e.g. Day 1 Match Play"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-comp-format">Format</Label>
            <select
              id="team-comp-format"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
            >
              {TEAM_FORMATS.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </select>
          </div>

          {formatType === 'best_ball' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Points per Half</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerHalf}
                    onChange={(e) =>
                      setPointsPerHalf(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
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
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Points per Half</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={pointsPerHalf}
                    onChange={(e) =>
                      setPointsPerHalf(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Pairings can be configured after creation.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !name.trim() ||
              (formatType === 'best_ball' && validBestBallGroups === 0)
            }
          >
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
