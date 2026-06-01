import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[96px] w-full resize-none rounded-[8px] border px-4 py-3 text-sm transition-all outline-none',
        // Light — default (empty/active)
        'bg-background text-foreground border-[#979797] placeholder:text-[#8e9191]',
        // Light — filled: hide border
        '[&:not(:placeholder-shown):not(:focus-visible)]:border-transparent',
        // Light — focus
        'focus-visible:bg-card focus-visible:border-primary',
        // Light — error
        'aria-invalid:bg-card aria-invalid:border-destructive',
        // Light — disabled
        'disabled:bg-muted disabled:text-border disabled:placeholder:text-border disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent',
        // Dark — default
        'dark:bg-card dark:border-[#979797]',
        // Dark — filled: hide border
        'dark:[&:not(:placeholder-shown):not(:focus-visible)]:border-transparent',
        // Dark — focus
        'dark:focus-visible:bg-card dark:focus-visible:border-primary',
        // Dark — disabled
        'dark:disabled:bg-card dark:disabled:text-muted-foreground dark:disabled:border-transparent',
        // Selection
        'selection:bg-primary selection:text-primary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
