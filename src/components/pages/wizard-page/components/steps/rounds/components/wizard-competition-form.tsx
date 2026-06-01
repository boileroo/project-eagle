import { useState } from 'react';
import type {
  WizardCompetition,
  WizardPlayer,
  WizardTeam,
} from '@/lib/validators';
import type { CompetitionConfig } from '@/lib/competition-config';
import { isBonusFormat, isTeamFormat } from '@/lib/competition-config';
import {
  INDIVIDUAL_FORMATS,
  TEAM_FORMATS,
  BONUS_FORMATS,
} from '@/components/pages/round-detail-page/components/constants';
import { ScoringBasisRadio } from '@/components/pages/round-detail-page/components/competitions/competition-fields/scoring-basis-radio';
import { PointsFields } from '@/components/pages/round-detail-page/components/competitions/competition-fields/points-fields';
import { BonusModeFields } from '@/components/pages/round-detail-page/components/competitions/competition-fields/bonus-mode-fields';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectInput } from '@/components/ui/select-input';

type CompetitionCategory = WizardCompetition['competitionCategory'];

function defaultMatchPoints(teams: WizardTeam[] | undefined): number {
  if (!teams || teams.length < 2) return 1;
  const sizes = teams.map((t) => t.playerIndices.length).filter((n) => n > 0);
  return sizes.length >= 2 ? Math.min(...sizes) : 1;
}

function defaultConfig(
  formatType: CompetitionConfig['formatType'],
  teams?: WizardTeam[],
): CompetitionConfig {
  const matchPoints = defaultMatchPoints(teams);
  switch (formatType) {
    case 'match_play':
      return {
        formatType,
        config: {
          scoringBasis: 'stableford',
          pointsPerWin: matchPoints,
          pointsPerHalf: matchPoints / 2,
          pairings: [],
        },
      };
    case 'best_ball':
      return {
        formatType,
        config: {
          pointsPerWin: matchPoints,
          pointsPerHalf: matchPoints / 2,
          pairings: [],
        },
      };
    case 'nearest_pin':
    case 'longest_drive':
      return {
        formatType,
        config: { holeNumber: 1, bonusMode: 'standalone', bonusPoints: 1 },
      };
    case 'rumble':
      return {
        formatType,
        config: { scoringBasis: 'stableford', pointsPerWin: 1 },
      };
    case 'hi_lo':
      return {
        formatType,
        config: { pointsPerWin: matchPoints, pointsPerHalf: matchPoints / 2 },
      };
    case 'wolf':
    case 'six_point':
    case 'chair':
      return { formatType, config: { scoringBasis: 'stableford' } };
  }
}

function categoryForFormat(
  formatType: CompetitionConfig['formatType'],
  hasTeams: boolean,
): CompetitionCategory {
  if (isBonusFormat(formatType)) return 'bonus';
  if (isTeamFormat(formatType)) return 'match';
  if (formatType === 'match_play') return hasTeams ? 'match' : 'game';
  return 'game';
}

function initialFormat(
  mode: 'game' | 'bonus',
  hasTeams: boolean,
): CompetitionConfig['formatType'] {
  if (mode === 'bonus') return BONUS_FORMATS[0].value;
  if (hasTeams) return TEAM_FORMATS[0].value;
  return INDIVIDUAL_FORMATS[0].value;
}

interface WizardCompetitionFormProps {
  mode: 'game' | 'bonus';
  hasTeams: boolean;
  players: WizardPlayer[];
  teams?: WizardTeam[];
  onAdd: (comps: WizardCompetition[]) => void;
  onCancel: () => void;
}

export function WizardCompetitionForm({
  mode,
  hasTeams,
  teams,
  onAdd,
  onCancel,
}: WizardCompetitionFormProps) {
  const startFormat = initialFormat(mode, hasTeams);
  const [name, setName] = useState('');
  const [formatType, setFormatType] =
    useState<CompetitionConfig['formatType']>(startFormat);
  const [config, setConfig] = useState<CompetitionConfig>(
    defaultConfig(startFormat, teams),
  );

  const category = categoryForFormat(formatType, hasTeams);

  const handleFormatChange = (ft: CompetitionConfig['formatType']) => {
    setFormatType(ft);
    setConfig(defaultConfig(ft, teams));
  };

  const updateConfig = (patch: Partial<CompetitionConfig['config']>) => {
    setConfig(
      (prev) =>
        ({
          ...prev,
          config: { ...prev.config, ...patch },
        }) as CompetitionConfig,
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd([
      {
        name: name.trim(),
        competitionCategory: category,
        competitionConfig: config,
      },
    ]);
  };

  const isValid = name.trim().length > 0;
  const heading =
    mode === 'bonus' ? 'Add Bonus' : hasTeams ? 'Add Match' : 'Add Game';

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <Heading level={4}>{heading}</Heading>

      <div className="space-y-1">
        <Label htmlFor="comp-name">Name</Label>
        <Input
          id="comp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            mode === 'bonus'
              ? 'e.g. Nearest the Pin #7'
              : hasTeams
                ? 'e.g. Team Match'
                : 'e.g. Wolf, Skins'
          }
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="comp-format">Format</Label>
        <SelectInput
          id="comp-format"
          value={formatType}
          onChange={(e) =>
            handleFormatChange(
              e.target.value as CompetitionConfig['formatType'],
            )
          }
        >
          {mode === 'bonus' &&
            BONUS_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          {mode === 'game' &&
            !hasTeams &&
            INDIVIDUAL_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          {mode === 'game' &&
            hasTeams &&
            TEAM_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
        </SelectInput>
      </div>

      {(formatType === 'wolf' ||
        formatType === 'six_point' ||
        formatType === 'chair' ||
        formatType === 'match_play' ||
        formatType === 'rumble') && (
        <ScoringBasisRadio
          name={`scoring-basis-${formatType}`}
          value={
            (
              config as {
                formatType: string;
                config: { scoringBasis: 'stableford' | 'gross' | 'net' };
              }
            ).config.scoringBasis
          }
          onChange={(v) => updateConfig({ scoringBasis: v })}
        />
      )}

      {((formatType === 'match_play' && category === 'match') ||
        formatType === 'hi_lo' ||
        formatType === 'best_ball') && (
        <PointsFields
          pointsPerWin={
            (config as { config: { pointsPerWin: number } }).config.pointsPerWin
          }
          pointsPerHalf={
            (config as { config: { pointsPerHalf: number } }).config
              .pointsPerHalf
          }
          onPointsPerWinChange={(v) => updateConfig({ pointsPerWin: v })}
          onPointsPerHalfChange={(v) => updateConfig({ pointsPerHalf: v })}
        />
      )}

      {formatType === 'rumble' && (
        <div className="space-y-1">
          <Label>Points per Match</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={
              (config as { config: { pointsPerWin: number } }).config
                .pointsPerWin
            }
            onChange={(e) =>
              updateConfig({ pointsPerWin: parseFloat(e.target.value) || 0 })
            }
            className="w-32"
          />
        </div>
      )}

      {(formatType === 'nearest_pin' || formatType === 'longest_drive') && (
        <BonusModeFields
          holeNumber={
            (
              config as {
                config: {
                  holeNumber: number;
                  bonusMode: 'standalone' | 'contributor';
                  bonusPoints: number;
                };
              }
            ).config.holeNumber
          }
          bonusMode={
            (
              config as {
                config: {
                  holeNumber: number;
                  bonusMode: 'standalone' | 'contributor';
                  bonusPoints: number;
                };
              }
            ).config.bonusMode
          }
          bonusPoints={
            (
              config as {
                config: {
                  holeNumber: number;
                  bonusMode: 'standalone' | 'contributor';
                  bonusPoints: number;
                };
              }
            ).config.bonusPoints
          }
          onHoleNumberChange={(v) => updateConfig({ holeNumber: v })}
          onBonusModeChange={(v) => updateConfig({ bonusMode: v })}
          onBonusPointsChange={(v) => updateConfig({ bonusPoints: v })}
        />
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!isValid}>
          Add
        </Button>
      </div>
    </div>
  );
}
