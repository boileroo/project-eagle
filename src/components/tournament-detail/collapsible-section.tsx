import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function CollapsibleSection({
  step,
  title,
  count,
  countLabel,
  defaultOpen = false,
  actions,
  children,
}: {
  /** Optional step number shown as a circle badge */
  step?: number;
  /** Section title */
  title: string;
  /** Count to display in the header badge */
  count?: number;
  /** Label for the count badge (e.g. "player", "round") — auto-pluralised */
  countLabel?: string;
  /** Whether the section starts open */
  defaultOpen?: boolean;
  /** Action buttons rendered in the header (right side, before the chevron) */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step != null && (
                  <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {step}
                  </span>
                )}
                <span>{title}</span>
                {count != null && countLabel && (
                  <Badge variant="secondary">
                    {count} {countLabel}
                    {count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Stop propagation on actions so clicking them doesn't toggle */}
                {actions && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        e.stopPropagation();
                    }}
                  >
                    {actions}
                  </div>
                )}
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
