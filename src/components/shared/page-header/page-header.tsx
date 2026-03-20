import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'warning' | 'success';

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
 * description, and right-aligned action buttons.
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
    <>
      <div className="flex items-center justify-between">
        <div>
          {breadcrumb && (
            <div className="text-muted-foreground mb-1 text-sm">
              {breadcrumb}
            </div>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {statusBadge && (
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            )}
          </div>
          {metadata && (
            <div className="text-muted-foreground mt-1 flex items-center gap-3">
              {metadata}
            </div>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {description && <p className="text-muted-foreground">{description}</p>}
    </>
  );
}
