import * as React from 'react';
import { cn } from '@/lib/utils';

interface ValidationErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string | null;
}

export function ValidationError({
  message,
  className,
  ...props
}: ValidationErrorProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'bg-destructive text-destructive-foreground rounded-xl p-3 text-sm font-medium',
        className,
      )}
      role="alert"
      {...props}
    >
      {message}
    </div>
  );
}
