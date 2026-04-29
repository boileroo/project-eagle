import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'xs' | 'sm' | 'base' | 'lg';
  color?: 'default' | 'muted' | 'white' | 'red' | 'blue' | 'green';
  asChild?: boolean;
}

export function Text({
  size = 'base',
  color = 'default',
  asChild = false,
  className,
  children,
  ...props
}: TextProps) {
  const Comp = asChild ? Slot.Root : 'p';

  const sizes = {
    base: 'text-base',
    sm: 'text-sm font-medium',
    xs: 'text-xs',
    lg: 'text-lg',
  };

  const colors = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    white: 'text-tokyo-white',
    red: 'text-tokyo-red',
    blue: 'text-tokyo-blue',
    green: 'text-tokyo-green',
  };

  return (
    <Comp className={cn(sizes[size], colors[color], className)} {...props}>
      {children}
    </Comp>
  );
}
