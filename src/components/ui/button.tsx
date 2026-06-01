import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary aria-invalid:ring-2 aria-invalid:ring-destructive",
  {
    variants: {
      variant: {
        // Fill — green bg, white text
        default:
          'bg-primary text-primary-foreground hover:bg-[#28cc86] active:bg-[#28cc86] disabled:bg-secondary disabled:text-border',

        // Line (outline) — green border + text on white, light-mode
        outline:
          'border border-primary bg-card text-primary hover:bg-[#e9f8f2] active:bg-[#e9f8f2] disabled:border-border disabled:text-border',

        // Line (outline) — white border + text, for use on dark surfaces
        'outline-dark':
          'border border-white bg-transparent text-white hover:bg-[#e9f8f2]/10 active:bg-[#e9f8f2]/10 disabled:border-white/40 disabled:text-white/40',

        // Ghost (nude) — no border/bg, green text
        ghost:
          'bg-transparent text-primary hover:bg-[#e9f8f2] active:bg-[#e9f8f2] disabled:text-border',

        // Destructive
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive disabled:opacity-50',

        // Secondary
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50',

        link: 'text-primary underline-offset-4 hover:underline disabled:opacity-50',
      },
      size: {
        sm: 'h-8 px-[13px] rounded-[6px]',
        default: 'h-10 px-[21px] rounded-[6px]',
        lg: 'h-12 px-[28px] rounded-[8px]',
        // Icon sizes — square
        icon: 'size-10 rounded-[6px]',
        'icon-sm': 'size-8 rounded-[6px]',
        'icon-lg': 'size-12 rounded-[8px]',
        // Circle — FAB-style (Button/Circle in Figma, 54×54)
        circle:
          'size-[54px] rounded-full disabled:!bg-[#90e0bd] disabled:!text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
