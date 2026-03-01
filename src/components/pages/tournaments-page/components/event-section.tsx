import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EventSectionProps {
  title: string;
  count: number;
  children: ReactNode;
  emptyMessage: string;
}

export function EventSection({
  title,
  count,
  children,
  emptyMessage,
}: EventSectionProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasChildren = childArray.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {count > 0 && (
          <span className="text-muted-foreground text-sm">({count})</span>
        )}
      </div>

      {hasChildren ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
