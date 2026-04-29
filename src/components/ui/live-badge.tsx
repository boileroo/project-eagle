import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  className?: string;
}

export function LiveBadge({ className }: LiveBadgeProps) {
  return (
    <div
      className={cn(
        'border-tokyo-green/20 bg-tokyo-green/10 text-tokyo-green flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase',
        className,
      )}
    >
      <div className="bg-tokyo-green h-1.5 w-1.5 animate-pulse rounded-full shadow-[0_0_8px_rgba(158,206,106,0.8)]" />
      LIVE
    </div>
  );
}
