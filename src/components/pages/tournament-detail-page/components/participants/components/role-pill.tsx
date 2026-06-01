import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all';

const solidStyles: Record<string, string> = {
  commissioner: 'bg-primary border-primary text-primary-foreground',
  player: 'bg-info border-info text-white',
  guest: 'bg-muted border-muted-foreground/40 text-muted-foreground',
};

const outlineStyles: Record<string, string> = {
  commissioner: 'bg-primary/10 border-primary/50 text-primary',
  player: 'bg-info/10 border-info/50 text-info',
  guest: 'bg-muted border-muted-foreground/40 text-muted-foreground',
};

function roleInitial(role: string) {
  return role.charAt(0).toUpperCase();
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

interface RolePillProps {
  role: string;
  className?: string;
}

export function RolePill({ role, className }: RolePillProps) {
  return (
    <span
      title={roleLabel(role)}
      className={cn(
        base,
        outlineStyles[role] ?? outlineStyles.guest,
        className,
      )}
    >
      {roleInitial(role)}
    </span>
  );
}

export const RolePillButton = React.forwardRef<
  HTMLButtonElement,
  RolePillProps & React.ComponentPropsWithoutRef<'button'>
>(({ role, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    title={roleLabel(role)}
    className={cn(
      base,
      solidStyles[role] ?? solidStyles.player,
      'cursor-pointer hover:opacity-80',
      className,
    )}
    {...props}
  >
    {roleInitial(role)}
  </button>
));

RolePillButton.displayName = 'RolePillButton';
