import type { WizardStep } from '../types';

interface StepIndicatorProps {
  currentStep: WizardStep;
  isSingleRound: boolean;
}

const SINGLE_ROUND_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'event-type', label: 'Event Type' },
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'rounds', label: 'Round Setup' },
  { id: 'review', label: 'Review' },
];

const TOURNAMENT_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'event-type', label: 'Event Type' },
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

  return (
    <nav aria-label="Wizard steps" className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary text-primary border-2'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
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
                className={[
                  'hidden text-xs sm:block',
                  isCurrent
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={[
                  'mb-4 h-px w-6 flex-shrink-0',
                  index < currentIndex ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
