import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RemoveButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  label: string;
}

export const RemoveButton = React.forwardRef<
  HTMLButtonElement,
  RemoveButtonProps
>(({ label, className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="ghost"
    size="icon"
    aria-label={label}
    className={cn(
      'bg-destructive/10 text-destructive hover:bg-destructive h-6 w-6 rounded-full hover:text-white',
      className,
    )}
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </Button>
));

RemoveButton.displayName = 'RemoveButton';
