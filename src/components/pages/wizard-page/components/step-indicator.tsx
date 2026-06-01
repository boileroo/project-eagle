import { cn } from '@/lib/utils';
import type { WizardStep } from '../types';

interface StepIndicatorProps {
  currentStep: WizardStep;
  isSingleRound: boolean;
}

const SINGLE_ROUND_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'event-type', label: 'Type' },
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'rounds', label: 'Round' },
  { id: 'review', label: 'Review' },
];

const TOURNAMENT_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'event-type', label: 'Type' },
  { id: 'details', label: 'Details' },
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'review', label: 'Review' },
];

export function StepIndicator({
  currentStep,
  isSingleRound,
}: StepIndicatorProps) {
  const steps = isSingleRound ? SINGLE_ROUND_STEPS : TOURNAMENT_STEPS;
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progressPct =
    steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <nav aria-label="Wizard steps" className="relative flex w-full items-start">
      {/* Full-width track */}
      <div className="bg-border absolute top-3.5 right-0 left-0 h-px" />
      {/* Completed progress */}
      <div
        className="bg-primary absolute top-3.5 left-0 h-px transition-[width] duration-300"
        style={{ width: `${progressPct}%` }}
      />

      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div
            key={step.id}
            className="relative flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                'z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                isCompleted
                  ? 'bg-primary text-primary-foreground'
                  : isCurrent
                    ? 'border-primary bg-card text-primary border-2'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {isCompleted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'text-[10px] font-medium',
                isCurrent ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
