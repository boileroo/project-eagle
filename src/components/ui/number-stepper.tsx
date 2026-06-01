import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  className?: string;
}

/**
 * Mobile-friendly number input with decrement/increment buttons either side.
 * Replaces raw <input type="number"> for touch-friendly UIs.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  id,
  className,
}: NumberStepperProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[8px] border border-[#979797]',
        className,
      )}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease"
        className="text-muted-foreground hover:bg-muted/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-l-[7px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        id={id}
        aria-live="polite"
        className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums select-none"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase"
        className="text-muted-foreground hover:bg-muted/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-r-[7px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
