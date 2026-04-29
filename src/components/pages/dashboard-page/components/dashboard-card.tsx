import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

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
  const sizeClasses = size === 'large' ? 'p-6' : 'p-5';

  const headingLevel = size === 'large' ? 5 : 6;

  return (
    <Link to={to} className="group block h-full focus-visible:outline-none">
      <Card
        isHoverable
        className={`flex h-full flex-col gap-1 rounded-2xl border-white/5 ${sizeClasses}`}
      >
        <Heading level={headingLevel} color="white" className="mb-0">
          {title}
        </Heading>
        <Text size="xs" color="muted" className="mb-0 leading-relaxed">
          {description}
        </Text>
      </Card>
    </Link>
  );
}
