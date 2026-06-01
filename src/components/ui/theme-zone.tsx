import * as React from 'react';
import { cn } from '@/lib/utils';

interface ThemeZoneProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: string;
}

export function ThemeZone({
  theme: _theme,
  className,
  children,
  ...props
}: ThemeZoneProps) {
  return (
    <div className={cn('bg-background text-foreground', className)} {...props}>
      {children}
    </div>
  );
}
