import type { ReactNode } from 'react';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface PageHeaderProps {
  breadcrumb?: ReactNode;
  title: string;
  statusBadge?: { label: string; variant: BadgeVariant };
  metadata?: ReactNode;
  description?: string;
  actions?: ReactNode;
}

/**
 * Shared page header layout used by both Tournament and Round detail pages.
 * Provides consistent styling for breadcrumb, title + status, metadata,
 * description, and action buttons.
 *
 * On mobile: stacked layout with actions below all header info.
 * On desktop: same stacked layout — no cramped side-by-side overflows.
 */
export function PageHeader({
  breadcrumb,
  title,
  statusBadge,
  metadata,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {breadcrumb && <div className="text-sm">{breadcrumb}</div>}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Heading level={1} className="sm:text-3xl">
            {title}
          </Heading>
          {statusBadge && (
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          )}
        </div>
        {metadata && (
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {metadata}
          </div>
        )}
        {description && (
          <Text size="sm" color="muted">
            {description}
          </Text>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
