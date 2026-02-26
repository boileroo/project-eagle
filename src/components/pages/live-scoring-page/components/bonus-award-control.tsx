// ──────────────────────────────────────────────
// BonusAwardControl — NTP / LD award UI for a specific hole
// Shown when there are bonus competitions on the current hole
// ──────────────────────────────────────────────

import { useState } from 'react';
import { useAwardBonus, useRemoveBonusAward } from '@/lib/competitions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isBonusFormat } from '@/lib/competitions';
import type { CompetitionConfig } from '@/lib/competitions';
import type { RoundCompetitionsData, RoundData } from '@/types';

type BonusAwardControlProps = {
  competitions: RoundCompetitionsData;
  holeNumber: number;
  /** Participants to show in the award dropdown — should be scoped to the current group */
  participants: RoundData['participants'];
  /** Can the current user assign an award? (commissioner or marker) */
  canAward: boolean;
  /** Can the current user remove an award? (commissioner only) */
  canRemove: boolean;
  onChanged: () => void;
};

export function BonusAwardControl({
  competitions,
  holeNumber,
  participants,
  canAward,
  canRemove,
  onChanged,
}: BonusAwardControlProps) {
  const [awarding, setAwarding] = useState<string | null>(null);
  const [awardBonus] = useAwardBonus();
  const [removeBonusAward] = useRemoveBonusAward();

  // Filter to bonus competitions assigned to this hole
  const bonusComps = competitions.filter((comp) => {
    if (!isBonusFormat(comp.formatType as CompetitionConfig['formatType']))
      return false;
    const config = comp.configJson as { holeNumber?: number } | null;
    return config?.holeNumber === holeNumber;
  });

  if (bonusComps.length === 0) return null;

  const handleAward = async (
    competitionId: string,
    roundParticipantId: string,
  ) => {
    setAwarding(competitionId);
    await awardBonus({
      variables: { competitionId, roundParticipantId },
      onSuccess: () => {
        toast.success('Award saved.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
    setAwarding(null);
  };

  const handleRemove = async (competitionId: string) => {
    setAwarding(competitionId);
    await removeBonusAward({
      variables: { competitionId },
      onSuccess: () => {
        toast.success('Award removed.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
    setAwarding(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {bonusComps.map((comp) => {
        const typeLabel = comp.formatType === 'nearest_pin' ? 'NTP' : 'LD';
        const award = comp.bonusAwards[0] ?? null;
        const isPending = awarding === comp.id;

        return (
          <div
            key={comp.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
              <span className="text-sm font-medium">{comp.name}</span>
            </div>

            <div className="flex items-center gap-2">
              {award ? (
                <>
                  <Badge variant="default" className="text-xs">
                    {award.roundParticipant?.person?.displayName ?? 'Unknown'}
                  </Badge>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => handleRemove(comp.id)}
                    >
                      Remove
                    </Button>
                  )}
                </>
              ) : canAward ? (
                <select
                  className="border-input bg-background rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                  value=""
                  disabled={isPending}
                  onChange={(e) => {
                    if (e.target.value) handleAward(comp.id, e.target.value);
                  }}
                >
                  <option value="">Award to…</option>
                  {participants.map((rp) => (
                    <option key={rp.id} value={rp.id}>
                      {rp.person.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-xs">
                  Not awarded
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
