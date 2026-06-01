import type { EventType } from '../../types';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Flag, Trophy } from 'lucide-react';

interface EventTypeStepProps {
  value: EventType;
  onChange: (value: EventType) => void;
  onNext: () => void;
}

const OPTIONS: {
  id: EventType;
  icon: typeof Flag;
  title: string;
  description: string;
}[] = [
  {
    id: 'single_round',
    icon: Flag,
    title: 'Single Round',
    description:
      'A one-off round with players and competitions. No multi-round standings.',
  },
  {
    id: 'tournament',
    icon: Trophy,
    title: 'Tournament',
    description:
      'Multiple rounds with overall standings, teams, and a final leaderboard.',
  },
];

export function EventTypeStep({ value, onChange, onNext }: EventTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Heading level={2}>What are you setting up?</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Choose the type of event you want to create.
        </Text>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map(({ id, icon: Icon, title, description }) => {
          const isSelected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-5 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/40 shadow-sm',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 shrink-0 rounded-xl p-2.5',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <Heading level={3} color="inherit">
                  {title}
                </Heading>
                <Text size="sm" color="muted" className="mt-1 leading-relaxed">
                  {description}
                </Text>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button size="lg" className="w-full" onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
