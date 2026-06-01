import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  [
    'flex w-full min-w-0 rounded-[8px] border transition-all outline-none',
    // Light — default (empty/active)
    'bg-background border-[#979797] text-foreground placeholder:text-[#8e9191]',
    // Light — filled (has value, no focus): hide border
    '[&:not(:placeholder-shown):not(:focus-visible)]:border-transparent',
    // Light — focus: green ring
    'focus-visible:bg-card focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0',
    // Light — error (aria-invalid): red border at rest
    'aria-invalid:bg-card aria-invalid:border-destructive',
    // Light — error + focused: red ring overrides green
    'aria-invalid:focus-visible:ring-destructive aria-invalid:focus-visible:border-destructive',
    // Light — disabled
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-border disabled:border-transparent disabled:placeholder:text-border',
    // Dark — default (empty/active)
    'dark:bg-card dark:border-[#979797]',
    // Dark — filled: hide border
    'dark:[&:not(:placeholder-shown):not(:focus-visible)]:border-transparent',
    // Dark — focus
    'dark:focus-visible:bg-card dark:focus-visible:border-primary dark:focus-visible:ring-primary',
    // Dark — error + focused
    'dark:aria-invalid:focus-visible:ring-destructive dark:aria-invalid:focus-visible:border-destructive',
    // Dark — disabled
    'dark:disabled:bg-card dark:disabled:text-muted-foreground dark:disabled:border-transparent',
    // File input resets
    'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
    // Selection
    'selection:bg-primary selection:text-primary-foreground',
  ],
  {
    variants: {
      size: {
        // Figma: Input/Md — 36px height, 12px text
        sm: 'h-9 px-[13px] text-xs',
        // Figma: Input/Lg — 40px height, 14px text (default)
        default: 'h-10 px-[13px] text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

function Input({
  className,
  type,
  size,
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
