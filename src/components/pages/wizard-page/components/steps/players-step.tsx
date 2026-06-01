import { useState } from 'react';
import type { WizardPlayer } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { NumberStepper } from '@/components/ui/number-stepper';

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
      <div className="text-center">
        <Heading level={2}>Players</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Set the number of players and their names. You are Player 1. Other
          players can join later and update their own details.
        </Text>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="player-count">Number of players</Label>
        <NumberStepper
          id="player-count"
          value={count}
          onChange={handleCountChange}
          min={1}
          max={40}
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

      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            onChange(currentPlayers);
            onNext();
          }}
          disabled={!canProceed}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onBack}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
