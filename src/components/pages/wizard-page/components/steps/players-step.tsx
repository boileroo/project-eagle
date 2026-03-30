import { useState } from 'react';
import type { WizardPlayer } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PlayersStepProps {
  players: WizardPlayer[];
  creatorName: string | null;
  onChange: (players: WizardPlayer[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlayersStep({
  players,
  creatorName,
  onChange,
  onNext,
  onBack,
}: PlayersStepProps) {
  const [count, setCount] = useState(players.length || 2);

  const ensurePlayerCount = (n: number) => {
    const next = [...players];
    while (next.length < n) {
      const idx = next.length;
      next.push({
        displayName:
          idx === 0 ? (creatorName ?? 'Player 1') : `Player ${idx + 1}`,
        currentHandicap: 0,
      });
    }
    return next.slice(0, n);
  };

  const handleCountChange = (n: number) => {
    const clamped = Math.max(1, Math.min(40, n));
    setCount(clamped);
    onChange(ensurePlayerCount(clamped));
  };

  const handleNameChange = (index: number, name: string) => {
    const next = [...players];
    next[index] = { ...next[index], displayName: name };
    onChange(next);
  };

  const currentPlayers = ensurePlayerCount(count);
  const canProceed = currentPlayers.every(
    (p) => p.displayName.trim().length > 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Players</h2>
        <p className="text-muted-foreground text-sm">
          Set the number of players and their names. You are Player 1. Other
          players can join later and update their own details.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="player-count">Number of players</Label>
        <Input
          id="player-count"
          type="number"
          min={1}
          max={40}
          value={count}
          onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
          className="w-24"
        />
      </div>

      <div className="space-y-2">
        {currentPlayers.map((player, index) => (
          <div key={index} className="space-y-1">
            <Label htmlFor={`player-name-${index}`} className="text-xs">
              {index === 0 ? 'Your name' : `Player ${index + 1}`}
            </Label>
            <Input
              id={`player-name-${index}`}
              value={player.displayName}
              onChange={(e) => handleNameChange(index, e.target.value)}
              placeholder={`Player ${index + 1}`}
              readOnly={index === 0 && !!creatorName}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => {
            onChange(currentPlayers);
            onNext();
          }}
          disabled={!canProceed}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
