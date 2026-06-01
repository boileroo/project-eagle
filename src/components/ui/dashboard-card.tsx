import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementType } from 'react';

export type CardColor = 'primary' | 'amber' | 'info' | 'default';

interface DashboardCardProps {
  color?: CardColor;
  title: string;
  description: string;
  linkText: string;
  icon?: ElementType;
  onClick: () => void;
  className?: string;
}

export const colorVariants: Record<CardColor, string> = {
  primary: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
  amber: 'bg-amber text-accent-foreground shadow-lg shadow-amber/20',
  info: 'bg-info text-primary-foreground shadow-lg shadow-info/20',
  default:
    'bg-card text-card-foreground shadow-md shadow-black/5 border border-border/50',
};

const textVariants: Record<CardColor, string> = {
  primary: 'text-primary-foreground/90',
  amber: 'text-accent-foreground/80',
  info: 'text-primary-foreground/90',
  default: 'text-muted-foreground',
};

export function DashboardCard({
  color = 'default',
  title,
  description,
  linkText,
  icon: Icon,
  onClick,
  className,
}: DashboardCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex h-full w-full flex-col p-6 text-left transition-transform hover:scale-[1.02] focus-visible:outline-none active:scale-[0.98]',
        colorVariants[color],
        className,
      )}
      style={{ borderRadius: 24 }}
    >
      <div
        className={cn(
          'flex h-full w-full flex-col',
          !description && 'flex-row items-center justify-between',
        )}
      >
        <div className={cn(!description && 'flex items-center')}>
          {Icon && (
            <div
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10',
                description ? 'mb-4' : 'mr-4',
              )}
            >
              <Icon className="size-5" />
            </div>
          )}
          <Heading
            level={2}
            color="inherit"
            className={cn('mb-2', !description && 'mb-0')}
          >
            {title}
          </Heading>
        </div>
        <Text
          size="sm"
          className={cn(
            'mb-4 max-w-[95%] leading-relaxed md:max-w-[85%]',
            textVariants[color],
            description ? 'block' : 'hidden',
          )}
        >
          {description}
        </Text>
        <div
          className={cn(
            'mt-auto flex items-center text-xs font-bold tracking-wider uppercase transition-opacity group-hover:opacity-80',
            !description && 'mt-0',
          )}
        >
          {linkText}
          <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}
