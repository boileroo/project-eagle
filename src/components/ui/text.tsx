import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'default' | 'muted' | 'small' | 'xs' | 'label';
  asChild?: boolean;
}

export function Text({
  variant = 'default',
  asChild = false,
  className,
  children,
  ...props
}: TextProps) {
  const Comp = asChild ? Slot.Root : 'p';

  const variants = {
    default: 'text-foreground text-base',
    muted: 'text-muted-foreground text-sm',
    small: 'text-foreground/90 text-sm',
    xs: 'text-foreground/80 text-xs',
    label: 'label-caps text-foreground/90 text-xs',
  };

  return (
    <Comp className={cn(variants[variant], className)} {...props}>
      {children}
    </Comp>
  );
}
