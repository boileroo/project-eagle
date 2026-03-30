import { useState } from 'react';
import type { WizardRound, WizardPlayer } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { RoundEditor } from './rounds/round-editor';

interface CourseOption {
  id: string;
  name: string;
}

interface RoundsStepProps {
  rounds: WizardRound[];
  players: WizardPlayer[];
  courses: CourseOption[];
  hasTeams: boolean;
  isSingleRound: boolean;
  defaultRound: () => WizardRound;
  onChange: (rounds: WizardRound[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RoundsStep({
  rounds,
  players,
  courses,
  hasTeams,
  isSingleRound,
  defaultRound,
  onChange,
  onNext,
  onBack,
}: RoundsStepProps) {
  const [openRounds, setOpenRounds] = useState<Set<number>>(() => new Set([0]));

  const toggleOpen = (index: number, open: boolean) => {
    setOpenRounds((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const handleRoundChange = (index: number, round: WizardRound) => {
    onChange(rounds.map((r, i) => (i === index ? round : r)));
  };

  const handleAddRound = () => {
    const newIndex = rounds.length;
    onChange([...rounds, defaultRound()]);
    setOpenRounds((prev) => new Set([...prev, newIndex]));
  };

  const handleRemoveRound = (index: number) => {
    onChange(rounds.filter((_, i) => i !== index));
    setOpenRounds((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const canProceed = rounds.every((r) => r.courseId.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {isSingleRound ? 'Round Setup' : 'Rounds'}
        </h2>
        <p className="text-muted-foreground text-sm">
          Configure{isSingleRound ? ' your round' : ' each round'}: choose a
          course, set the date, and add competitions. Players will be split into
          balanced groups automatically — you can reassign them from the round
          detail page before play begins.
        </p>
      </div>

      <div className="space-y-4">
        {rounds.map((round, index) => {
          if (isSingleRound) {
            return (
              <RoundEditor
                key={index}
                round={round}
                roundNumber={index + 1}
                players={players}
                courses={courses}
                hasTeams={hasTeams}
                onChange={(r) => handleRoundChange(index, r)}
              />
            );
          }

          const courseName = round.courseId
            ? (courses.find((c) => c.id === round.courseId)?.name ?? '')
            : '';
          const isOpen = openRounds.has(index);

          return (
            <Collapsible
              key={index}
              open={isOpen}
              onOpenChange={(open) => toggleOpen(index, open)}
            >
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className="font-medium">Round {index + 1}</span>
                      {!isOpen && courseName && (
                        <span className="text-muted-foreground text-sm">
                          {courseName}
                          {round.date ? ` · ${round.date}` : ''}
                        </span>
                      )}
                      {!isOpen && !courseName && (
                        <span className="text-muted-foreground text-sm italic">
                          Not configured
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  {rounds.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveRound(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="border-t px-4 pt-3 pb-4">
                    <RoundEditor
                      round={round}
                      roundNumber={index + 1}
                      players={players}
                      courses={courses}
                      hasTeams={hasTeams}
                      onChange={(r) => handleRoundChange(index, r)}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {!isSingleRound && (
        <Button type="button" variant="outline" onClick={handleAddRound}>
          Add Round
        </Button>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  );
}
