import { useState } from 'react';
import { useAwardSideGame, useRemoveSideGameAward } from '@/lib/games';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { SideGamesData, RoundData } from '@/types';

type BonusAwardControlProps = {
  sideGames: SideGamesData;
  holeNumber: number;
  players: RoundData['players'];
  canAward: boolean;
  canRemove: boolean;
  onChanged: () => void;
};

export function BonusAwardControl({
  sideGames,
  holeNumber,
  players,
  canRemove,
  onChanged,
}: BonusAwardControlProps) {
  const [awarding, setAwarding] = useState<string | null>(null);
  const [awardSideGame] = useAwardSideGame();
  const [removeSideGameAward] = useRemoveSideGameAward();

  const bonusSideGames = sideGames.filter((sg) => sg.holeNumber === holeNumber);

  if (bonusSideGames.length === 0) return null;

  const handleAward = async (sideGameId: string, roundPlayerId: string) => {
    setAwarding(sideGameId);
    await awardSideGame({
      variables: { sideGameId, roundPlayerId },
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

  const handleRemove = async (sideGameId: string) => {
    setAwarding(sideGameId);
    await removeSideGameAward({
      variables: { sideGameId },
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
      {bonusSideGames.map((sg) => {
        const typeLabel = sg.format === 'nearest_pin' ? 'NTP' : 'LD';
        const winner = sg.winner ?? null;
        const isPending = awarding === sg.id;

        return (
          <div
            key={sg.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeLabel}
              </Badge>
              <span className="text-sm font-medium">{sg.name}</span>
            </div>

            <div className="flex items-center gap-2">
              {winner ? (
                <>
                  <Badge variant="default" className="text-xs">
                    {winner.person?.displayName ?? 'Unknown'}
                  </Badge>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => handleRemove(sg.id)}
                    >
                      Remove
                    </Button>
                  )}
                </>
              ) : (
                <select
                  className="border-input bg-background rounded-md border px-2 py-1 text-sm disabled:opacity-50"
                  value=""
                  disabled={isPending}
                  onChange={(e) => {
                    if (e.target.value) handleAward(sg.id, e.target.value);
                  }}
                >
                  <option value="">Award to…</option>
                  {players.map((rp) => (
                    <option key={rp.id} value={rp.id}>
                      {rp.person.displayName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
