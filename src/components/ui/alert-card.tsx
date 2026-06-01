import * as React from 'react';
import { AlertCircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface AlertCardAction {
  label: string;
  onClick?: () => void;
}

interface AlertCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  primaryAction?: AlertCardAction;
  secondaryAction?: AlertCardAction;
  className?: string;
}

function AlertCard({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className,
}: AlertCardProps) {
  return (
    <div
      data-slot="alert-card"
      className={cn(
        'bg-card flex w-full max-w-[300px] flex-col items-center gap-0 rounded-[20px] p-6 text-center',
        className,
      )}
    >
      {/* Icon */}
      <div className="text-destructive mb-4 flex size-12 items-center justify-center">
        {icon ?? <AlertCircleIcon className="size-12" strokeWidth={1.5} />}
      </div>

      {/* Title */}
      <Heading level={2} className="mb-2">
        {title}
      </Heading>

      {description && (
        <Text size="sm" color="muted" className="mb-6">
          {description}
        </Text>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center justify-end gap-2 self-stretch">
          {secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button variant="ghost" size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { AlertCard };
export type { AlertCardProps, AlertCardAction };
