import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  className?: string;
}

export function LiveBadge({ className }: LiveBadgeProps) {
  return (
    <div
      className={cn(
        'border-success/20 bg-success/10 text-success flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase',
        className,
      )}
    >
      <div className="bg-success h-1.5 w-1.5 animate-pulse rounded-full" />
      LIVE
    </div>
  );
}
