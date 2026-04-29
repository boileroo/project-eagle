import type { ReactNode } from 'react';
import { Text } from '@/components/ui/text';

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  gridCols?: 1 | 2 | 3;
}

export function DashboardSection({
  title,
  children,
  gridCols = 2,
}: DashboardSectionProps) {
  const gridClass =
    gridCols === 3
      ? 'sm:grid-cols-3'
      : gridCols === 2
        ? 'sm:grid-cols-2'
        : 'grid-cols-1';

  return (
    <section className="space-y-4">
      <Text
        size="xs"
        color="blue"
        className="font-bold tracking-[0.2em] uppercase"
      >
        {title}
      </Text>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </section>
  );
}
