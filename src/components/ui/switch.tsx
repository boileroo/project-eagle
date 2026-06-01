import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Track — 40×24px, fully pill
        'peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none',
        // On: primary green | Off light: Black 10 | Off dark: white
        'data-[state=checked]:bg-primary',
        'data-[state=unchecked]:bg-secondary dark:data-[state=unchecked]:bg-white',
        // Focus / disabled
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Thumb — 18×18px white circle
          'pointer-events-none block size-[18px] rounded-full bg-white shadow-sm ring-0 transition-transform',
          // Off: x=3  On: x=19  (3 + 18 + 3 = 24px = track height ✓)
          'data-[state=unchecked]:translate-x-[3px]',
          'data-[state=checked]:translate-x-[19px]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
