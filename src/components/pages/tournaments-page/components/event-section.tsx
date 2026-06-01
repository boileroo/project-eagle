import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

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
        <Heading level={2}>{title}</Heading>
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
            <Text size="sm" color="muted">
              {emptyMessage}
            </Text>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
