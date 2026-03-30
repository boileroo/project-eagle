import * as React from 'react';
import { cn } from '@/lib/utils';

export function AerieTextLogo({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-tokyo-red font-heading text-sm font-bold tracking-[0.3em] uppercase',
        className,
      )}
      {...props}
    >
      Aerie
    </p>
  );
}
