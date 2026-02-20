import { useState } from 'react';
import { awardBonusFn, removeBonusAwardFn } from '@/lib/competitions.server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { EditCompetitionDialog } from './edit-competition-dialog';
import type { RoundData, CompetitionsData } from './types';

export function BonusCompRow({
  comp,
  holeNumber,
  award,
  participants,
  isCommissioner,
  roundStatus,
  hasGroups,
  onChanged,
}: {
  comp: CompetitionsData[number];
  holeNumber: number;
  award: CompetitionsData[number]['bonusAwards'][number] | undefined;
  participants: RoundData['participants'];
  isCommissioner: boolean;
  roundStatus: string;
  hasGroups: boolean;
  onChanged: () => void;
}) {
  const [awarding, setAwarding] = useState(false);

  const handleAward = async (roundParticipantId: string) => {
    setAwarding(true);
    try {
      await awardBonusFn({
        data: {
          competitionId: comp.id,
          roundParticipantId,
        },
      });
      toast.success('Award saved.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save award',
      );
    }
    setAwarding(false);
  };

  const handleRemoveAward = async () => {
    setAwarding(true);
    try {
      await removeBonusAwardFn({ data: { competitionId: comp.id } });
      toast.success('Award removed.');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove award',
      );
    }
    setAwarding(false);
  };

  const typeLabel = comp.formatType === 'nearest_pin' ? 'NTP' : 'LD';
  const config = comp.configJson as {
    holeNumber?: number;
    bonusMode?: string;
    bonusPoints?: number;
  } | null;
  const isContributor = config?.bonusMode === 'contributor';
  const canEdit = roundStatus === 'open';

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {typeLabel}
        </Badge>
        {isContributor && (
          <Badge variant="secondary" className="text-xs">
            +{config?.bonusPoints ?? 1} pts
          </Badge>
        )}
        <span className="text-sm">
          {comp.name}{' '}
          <span className="text-muted-foreground">(Hole {holeNumber})</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isCommissioner && (
          <EditCompetitionDialog
            comp={comp}
            hasGroups={hasGroups}
            onSaved={onChanged}
          />
        )}
        {award ? (
          <>
            <Badge variant="default">
              🏆 {award.roundParticipant?.person?.displayName ?? 'Unknown'}
            </Badge>
            {isCommissioner && canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-6 text-xs"
                disabled={awarding}
                onClick={handleRemoveAward}
              >
                ✕
              </Button>
            )}
          </>
        ) : canEdit ? (
          <Select
            className="h-8 px-2 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) handleAward(e.target.value);
            }}
            disabled={awarding}
          >
            <option value="">Award to…</option>
            {participants.map((rp) => (
              <option key={rp.id} value={rp.id}>
                {rp.person.displayName}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>
    </div>
  );
}
