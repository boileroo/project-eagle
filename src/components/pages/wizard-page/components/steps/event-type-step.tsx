import type { EventType } from '../../types';
import { Button } from '@/components/ui/button';

interface EventTypeStepProps {
  value: EventType;
  onChange: (value: EventType) => void;
  onNext: () => void;
}

export function EventTypeStep({ value, onChange, onNext }: EventTypeStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">What are you setting up?</h2>
        <p className="text-muted-foreground text-sm">
          Choose the type of event you want to create.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('single_round')}
          className={[
            'rounded-lg border p-5 text-left transition-colors',
            value === 'single_round'
              ? 'border-primary bg-primary/5'
              : 'hover:bg-muted/50',
          ].join(' ')}
        >
          <div className="mb-1 font-medium">Single Round</div>
          <p className="text-muted-foreground text-sm">
            A one-off round with players and competitions. No multi-round
            standings.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange('tournament')}
          className={[
            'rounded-lg border p-5 text-left transition-colors',
            value === 'tournament'
              ? 'border-primary bg-primary/5'
              : 'hover:bg-muted/50',
          ].join(' ')}
        >
          <div className="mb-1 font-medium">Tournament</div>
          <p className="text-muted-foreground text-sm">
            Multiple rounds with overall standings, teams, and a final
            leaderboard.
          </p>
        </button>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}
