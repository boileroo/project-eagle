import { Link } from '@tanstack/react-router';

interface DashboardCardProps {
  title: string;
  description: string;
  to: string;
  size?: 'default' | 'large';
}

export function DashboardCard({
  title,
  description,
  to,
  size = 'default',
}: DashboardCardProps) {
  const sizeClasses =
    size === 'large' ? 'p-6 font-semibold' : 'p-5 text-sm font-medium';

  const titleSizeClass = size === 'large' ? '' : 'text-sm';

  return (
    <Link
      to={to}
      className={`group bg-card hover:bg-background rounded-lg border transition-colors ${sizeClasses}`}
    >
      <h3 className={`mb-1 ${titleSizeClass} font-medium`}>{title}</h3>
      <p className="text-muted-foreground text-xs">{description}</p>
    </Link>
  );
}
