import * as React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5;
  color?: 'default' | 'muted' | 'primary' | 'destructive' | 'white' | 'inherit';
}

/**
 * Fixed-size headings for a mobile-first UI. No responsive breakpoint scaling.
 *
 * level 1 — 24px bold     — page title (<h1>)
 * level 2 — 20px bold     — section heading (<h2>)
 * level 3 — 16px bold     — card / subsection title (<h3>)
 * level 4 — 14px bold     — list item / minor heading (<h4>)
 * level 5 — 12px semibold — micro label (<h5>)
 */
export function Heading({
  level = 1,
  color = 'default',
  className,
  children,
  ...props
}: HeadingProps) {
  const Comp = `h${level}` as const;

  const sizeStyles = {
    1: 'text-2xl font-bold tracking-tight',
    2: 'text-xl font-bold tracking-tight',
    3: 'text-base font-bold',
    4: 'text-sm font-bold',
    5: 'text-xs font-semibold',
  };

  const colorStyles = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    destructive: 'text-destructive',
    white: 'text-white',
    inherit: 'text-inherit',
  };

  return (
    <Comp
      className={cn(sizeStyles[level], colorStyles[color], className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
