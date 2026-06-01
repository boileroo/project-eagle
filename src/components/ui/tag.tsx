import * as React from 'react';

import { cn } from '@/lib/utils';

interface TagProps extends React.ComponentPropsWithoutRef<'button'> {
  selected?: boolean;
}

const Tag = React.forwardRef<HTMLButtonElement, TagProps>(
  ({ selected = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        data-slot="tag"
        data-selected={selected}
        className={cn(
          'inline-flex h-7 items-center justify-center rounded-full border px-[9px] text-sm transition-all',
          selected
            ? [
                // Light selected: Green 10 bg, primary border + text
                'border-primary text-primary bg-[#e9f8f2] font-semibold',
                // Dark selected: no fill, primary border + text
                'dark:bg-transparent',
              ]
            : [
                // Light unselected: border token, muted text
                'border-border text-muted-foreground font-normal',
                // Dark unselected: muted-foreground border + text
                'dark:border-muted-foreground dark:text-muted-foreground',
              ],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Tag.displayName = 'Tag';

export { Tag };
export type { TagProps };
