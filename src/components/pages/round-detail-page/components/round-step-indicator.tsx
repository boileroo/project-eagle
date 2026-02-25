import {
  Pencil,
  Clock,
  PlayCircle,
  CheckCircle,
  LucideIcon,
} from 'lucide-react';

const ROUND_STEPS: Array<{
  status: string;
  label: string;
  Icon: LucideIcon;
}> = [
  { status: 'draft', label: 'Draft', Icon: Pencil },
  { status: 'scheduled', label: 'Awaiting Start', Icon: Clock },
  { status: 'open', label: 'In Play', Icon: PlayCircle },
  { status: 'finalized', label: 'Finished', Icon: CheckCircle },
];

const STATUS_ORDER = ['draft', 'scheduled', 'open', 'finalized'];

export function RoundStepIndicator({ status }: { status: string }) {
  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-0">
      {ROUND_STEPS.map((step, idx) => {
        const isActive = step.status === status;
        const isPast = idx < currentIdx;
        const isLast = idx === ROUND_STEPS.length - 1;

        return (
          <div key={step.status} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isPast
                      ? 'border-primary/40 bg-primary/10 text-primary/60'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground/40',
                ].join(' ')}
              >
                <step.Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={[
                  'truncate text-center text-xs',
                  isActive
                    ? 'text-foreground font-medium'
                    : isPast
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/50',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={[
                  'mb-5 h-0.5 w-full flex-shrink',
                  idx < currentIdx ? 'bg-primary/40' : 'bg-muted-foreground/20',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
