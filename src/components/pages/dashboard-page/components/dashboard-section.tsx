import type { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  gridCols?: 2 | 3;
}

export function DashboardSection({
  title,
  children,
  gridCols = 2,
}: DashboardSectionProps) {
  const gridClass = gridCols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
        {title}
      </h2>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </section>
  );
}
