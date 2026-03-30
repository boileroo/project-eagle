import { useState, useMemo } from 'react';
import { useCreateCompetition } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import { Button } from '@/components/ui/button';
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
import { INDIVIDUAL_FORMATS } from '../constants';
import { ScoringBasisRadio } from './competition-fields/scoring-basis-radio';
import type { RoundData } from '../types';

const REQUIRED_GROUP_SIZE: Record<string, number> = {
  wolf: 4,
  six_point: 3,
};

export function AddIndividualCompDialog({
  tournamentId,
  roundId,
  round,
  onSaved,
  disabled,
}: {
  tournamentId: string;
  roundId: string;
  round: RoundData;
  hasTeams?: boolean;
  disabled?: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [createCompetition, { isPending }] = useCreateCompetition();
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>('wolf');

  const [sixPointScoringBasis, setSixPointScoringBasis] = useState<
    'stableford' | 'gross' | 'net'
  >('stableford');

  const [wolfScoringBasis, setWolfScoringBasis] = useState<
    'stableford' | 'gross' | 'net'
  >('stableford');

  const [chairScoringBasis, setChairScoringBasis] = useState<
    'stableford' | 'gross' | 'net'
  >('stableford');

  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [pointsPerHalf, setPointsPerHalf] = useState(0.5);

  const [matchPlayScoringBasis, setMatchPlayScoringBasis] = useState<
    'stableford' | 'gross' | 'net'
  >('stableford');

  const groups = round.groups ?? [];
  const hasMultipleGroups = groups.length > 1;

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups.length === 1 ? (groups[0]?.id ?? '') : '',
  );

  const selectedGroupPlayerCount = useMemo(() => {
    if (!selectedGroupId) return 0;
    return round.participants.filter(
      (rp) => rp.roundGroupId === selectedGroupId,
    ).length;
  }, [selectedGroupId, round.participants]);

  const groupSizeValidation = useMemo(() => {
    if (!selectedGroupId) return { valid: true, message: null };

    const required = REQUIRED_GROUP_SIZE[formatType];
    if (!required) return { valid: true, message: null };

    if (selectedGroupPlayerCount !== required) {
      const formatLabel =
        INDIVIDUAL_FORMATS.find((f) => f.value === formatType)?.label ??
        formatType;
      return {
        valid: false,
        message: `${formatLabel} requires exactly ${required} players. The selected group has ${selectedGroupPlayerCount}.`,
      };
    }

    return { valid: true, message: null };
  }, [formatType, selectedGroupId, selectedGroupPlayerCount]);

  const availableFormats = useMemo(() => {
    if (!selectedGroupId) return INDIVIDUAL_FORMATS;
    return INDIVIDUAL_FORMATS.filter((f) => {
      const required = REQUIRED_GROUP_SIZE[f.value];
      if (!required) return true;
      return selectedGroupPlayerCount === required;
    });
  }, [selectedGroupId, selectedGroupPlayerCount]);

  const getFormatLabel = () => {
    return (
      INDIVIDUAL_FORMATS.find((f) => f.value === formatType)?.label ??
      formatType
    );
  };

  const resetForm = () => {
    setFormatType('wolf');
    setSixPointScoringBasis('stableford');
    setWolfScoringBasis('stableford');
    setChairScoringBasis('stableford');
    setMatchPlayScoringBasis('stableford');
    setPointsPerWin(1);
    setPointsPerHalf(0.5);
    setSelectedGroupId(groups.length === 1 ? (groups[0]?.id ?? '') : '');
  };

  const buildConfig = (): CompetitionConfig => {
    switch (formatType) {
      case 'wolf':
        return {
          formatType: 'wolf',
          config: { scoringBasis: wolfScoringBasis },
        };
      case 'six_point':
        return {
          formatType: 'six_point',
          config: { scoringBasis: sixPointScoringBasis },
        };
      case 'chair':
        return {
          formatType: 'chair',
          config: { scoringBasis: chairScoringBasis },
        };
      case 'match_play':
        return {
          formatType: 'match_play',
          config: {
            scoringBasis: matchPlayScoringBasis,
            pointsPerWin,
            pointsPerHalf,
            pairings: [],
          },
        };
      default:
        return { formatType: 'wolf', config: { scoringBasis: 'stableford' } };
    }
  };

  const canSubmit =
    !isPending &&
    groupSizeValidation.valid &&
    selectedGroupId !== '' &&
    (formatType !== 'match_play' || selectedGroupPlayerCount >= 2);

  const handleSave = async () => {
    await createCompetition({
      variables: {
        tournamentId,
        name: getFormatLabel(),
        competitionCategory: 'game',
        roundGroupId: selectedGroupId || null,
        roundId,
        competitionConfig: buildConfig(),
      },
      onSuccess: () => {
        toast.success('Game created.');
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
        <Button variant="outline" size="sm" disabled={disabled}>
          + Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Game</DialogTitle>
          <DialogDescription>
            Create a within-group game. Each group can have at most one game.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {hasMultipleGroups && (
            <div className="space-y-2">
              <Label htmlFor="game-group">Group</Label>
              <Select
                id="game-group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                autoFocus
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
          )}

          <div className="space-y-2">
            <Label htmlFor="game-format">Format</Label>
            <Select
              id="game-format"
              value={formatType}
              onChange={(e) =>
                setFormatType(e.target.value as CompetitionConfig['formatType'])
              }
              autoFocus={!hasMultipleGroups}
            >
              {availableFormats.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label}
                </option>
              ))}
            </Select>
          </div>

          {formatType === 'wolf' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Wolf rotates by group position. Points: wolf+partner win = 2
                each; lone wolf win = 6; blind lone wolf win = 9; losses award 2
                (or 3 for blind) to each opponent.
              </p>
              <ScoringBasisRadio
                value={wolfScoringBasis}
                onChange={setWolfScoringBasis}
                name="wolf-basis"
              />
            </div>
          )}

          {formatType === 'six_point' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                3-player game. Fixed distribution: 1st = 4 pts, 2nd = 2 pts, 3rd
                = 0 pts. Ties share points.
              </p>
              <ScoringBasisRadio
                value={sixPointScoringBasis}
                onChange={setSixPointScoringBasis}
                name="six-point-basis"
              />
            </div>
          )}

          {formatType === 'chair' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Win a hole outright to take the chair. Tie = chair holder
                retains. 1 point per hole the chair is held.
              </p>
              <ScoringBasisRadio
                value={chairScoringBasis}
                onChange={setChairScoringBasis}
                name="chair-basis"
              />
            </div>
          )}

          {formatType === 'match_play' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Head-to-head match play. Pairings are configured after creation
                using Configure Matches.
              </p>
              <ScoringBasisRadio
                value={matchPlayScoringBasis}
                onChange={setMatchPlayScoringBasis}
                name="match-play-basis"
              />
            </div>
          )}

          {!groupSizeValidation.valid && (
            <p className="text-destructive text-xs font-medium">
              {groupSizeValidation.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
