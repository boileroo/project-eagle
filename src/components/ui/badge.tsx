import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden',
  {
    variants: {
      variant: {
        // Green — primary action / notification count
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        // Muted surface
        secondary:
          'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
        // Error / danger
        destructive:
          'bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        // Bordered, transparent bg
        outline: 'border-border text-foreground [a&]:hover:bg-secondary',
        // Info blue
        info: 'bg-info text-white [a&]:hover:bg-info/90',
        // Warning orange
        warning: 'bg-warning text-foreground [a&]:hover:bg-warning/90',
        // Success green (alias of primary)
        success: 'bg-success text-primary-foreground [a&]:hover:bg-success/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
