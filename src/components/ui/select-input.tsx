import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

/**
 * Styled <select> wrapper that matches the Input component's visual style:
 * border, height, focus ring, and text size.
 */
function SelectInput({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select-input"
        className={cn(
          'bg-background text-foreground h-10 w-full appearance-none rounded-[8px] border border-[#979797] px-[13px] pr-9 text-sm transition-all outline-none',
          'focus-visible:border-primary focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-0',
          'disabled:bg-muted disabled:text-border disabled:cursor-not-allowed disabled:border-transparent',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
    </div>
  );
}

export { SelectInput };
