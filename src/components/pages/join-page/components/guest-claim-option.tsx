import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatHandicapWithFallback } from '@/lib/handicaps';
import { cn } from '@/lib/utils';

type GuestClaimOptionProps = {
  guest: {
    personId: string;
    displayName: string;
    currentHandicap: string | null;
    teamName: string | null;
  };
  selected: boolean;
  disabled: boolean;
  onSelect: (personId: string) => void;
};

export function GuestClaimOption({
  guest,
  selected,
  disabled,
  onSelect,
}: GuestClaimOptionProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(guest.personId)}
      disabled={disabled}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'hover:bg-accent/40 border-border',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{guest.displayName}</span>
            {guest.teamName ? (
              <Badge variant="secondary">{guest.teamName}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            Handicap{' '}
            {formatHandicapWithFallback(guest.currentHandicap, 'not set')}
          </p>
          <p className="text-muted-foreground text-sm">
            Keeps this player&apos;s current setup.
          </p>
        </div>
        <Button variant={selected ? 'default' : 'outline'} disabled={disabled}>
          {selected ? 'Selected' : 'Claim'}
        </Button>
      </div>
    </button>
  );
}
