import { CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type StepStatus = 'active' | 'inactive' | 'completed';

interface StepIndicatorProps {
  status: StepStatus;
  step?: number;
  className?: string;
}

const statusStyles: Record<StepStatus, string> = {
  // Green 10 bg, primary border, primary text
  active: 'bg-[#e9f8f2] border border-primary text-primary',
  // Black 10 bg, no border, Black 30 text
  inactive: 'bg-secondary border border-transparent text-[#8e9191]',
  // Primary green bg, white icon
  completed: 'bg-primary border border-transparent text-primary-foreground',
};

function StepIndicator({ status, step, className }: StepIndicatorProps) {
  return (
    <div
      data-slot="step-indicator"
      data-status={status}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-base font-semibold transition-colors',
        statusStyles[status],
        className,
      )}
    >
      {status === 'completed' ? (
        <CheckIcon className="size-4" />
      ) : (
        <span>{step}</span>
      )}
    </div>
  );
}

export { StepIndicator };
export type { StepStatus, StepIndicatorProps };
