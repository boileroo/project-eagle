import { useState } from 'react';
import { useAwardSideGame, useRemoveSideGameAward } from '@/lib/games';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import type { RoundData, SideGameData } from '../types';

export function BonusCompRow({
  sideGame,
  players,
  isCommissioner,
  onChanged,
}: {
  sideGame: SideGameData;
  players: RoundData['players'];
  isCommissioner: boolean;
  onChanged: () => void;
}) {
  const [awarding, setAwarding] = useState(false);
  const [awardSideGame] = useAwardSideGame();
  const [removeSideGameAward] = useRemoveSideGameAward();

  const handleAward = async (roundPlayerId: string) => {
    setAwarding(true);
    await awardSideGame({
      variables: { sideGameId: sideGame.id, roundPlayerId },
      onSuccess: () => {
        toast.success('Award saved.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
    setAwarding(false);
  };

  const handleRemoveAward = async () => {
    setAwarding(true);
    await removeSideGameAward({
      variables: { sideGameId: sideGame.id },
      onSuccess: () => {
        toast.success('Award removed.');
        onChanged();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
    setAwarding(false);
  };

  const typeLabel = sideGame.format === 'nearest_pin' ? 'NTP' : 'LD';
  const isContributor = sideGame.bonusMode === 'contributor';

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {typeLabel}
        </Badge>
        {isContributor && (
          <Badge variant="secondary" className="text-xs">
            +{sideGame.bonusPoints ?? 1} pts
          </Badge>
        )}
        <span className="text-sm">
          {sideGame.name}{' '}
          {sideGame.holeNumber != null && (
            <span className="text-muted-foreground">
              (Hole {sideGame.holeNumber})
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {sideGame.winner && (
          <>
            <Badge variant="default">
              🏆 {sideGame.winner.person?.displayName ?? 'Unknown'}
            </Badge>
            {isCommissioner && (
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
        )}
        {!sideGame.winner && isCommissioner && (
          <Select
            className="h-8 px-2 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) handleAward(e.target.value);
            }}
            disabled={awarding}
          >
            <option value="">Award to…</option>
            {players.map((rp) => (
              <option key={rp.id} value={rp.id}>
                {rp.person.displayName}
              </option>
            ))}
          </Select>
        )}
        {!sideGame.winner && !isCommissioner && (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>
    </div>
  );
}
