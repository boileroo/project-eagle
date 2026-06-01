import { useState } from 'react';
import type { WizardRound, WizardPlayer, WizardTeam } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react';
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
  teams: WizardTeam[];
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
  teams,
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
      if (open) next.add(index);
      else next.delete(index);
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
      <div className="text-center">
        <Heading level={2}>{isSingleRound ? 'Round Setup' : 'Rounds'}</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Choose a course, set the date, and add competitions.
        </Text>
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
                teams={teams}
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
              <div className="rounded-xl border">
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
                    <button
                      type="button"
                      onClick={() => handleRemoveRound(index)}
                      aria-label={`Remove round ${index + 1}`}
                      className="text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-md p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <CollapsibleContent>
                  <div className="border-t px-4 pt-3 pb-4">
                    <RoundEditor
                      round={round}
                      roundNumber={index + 1}
                      players={players}
                      teams={teams}
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

      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={onNext}
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
