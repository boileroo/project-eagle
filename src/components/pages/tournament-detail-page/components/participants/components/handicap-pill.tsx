import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'inline-flex h-7 min-w-11 shrink-0 items-center justify-center rounded-full border px-[9px] text-sm tabular-nums transition-all';

const interactive =
  'border-primary bg-[#e9f8f2] text-primary font-semibold cursor-pointer hover:opacity-80';

const display = 'border-border text-muted-foreground font-normal';

interface HandicapPillProps {
  value: string;
  className?: string;
}

export function HandicapPill({ value, className }: HandicapPillProps) {
  return <span className={cn(base, display, className)}>{value}</span>;
}

export const HandicapPillButton = React.forwardRef<
  HTMLButtonElement,
  HandicapPillProps & React.ComponentPropsWithoutRef<'button'>
>(({ value, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(base, interactive, className)}
    {...props}
  >
    {value}
  </button>
));

HandicapPillButton.displayName = 'HandicapPillButton';
