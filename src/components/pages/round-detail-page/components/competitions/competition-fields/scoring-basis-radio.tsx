import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface ScoringBasisRadioProps {
  value: 'stableford' | 'gross' | 'net';
  onChange: (value: 'stableford' | 'gross' | 'net') => void;
  name: string;
}

const OPTIONS = [
  { value: 'stableford', label: 'Stableford' },
  { value: 'gross', label: 'Gross' },
  { value: 'net', label: 'Net' },
] as const;

/**
 * Pill-style toggle group for selecting scoring basis.
 * Replaces native radio inputs for a more touch-friendly UI.
 */
export function ScoringBasisRadio({
  value,
  onChange,
  name,
}: ScoringBasisRadioProps) {
  return (
    <div className="space-y-2">
      <Label>Scoring Basis</Label>
      <div className="flex gap-2" role="radiogroup" aria-label="Scoring Basis">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            name={name}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              value === opt.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-foreground hover:bg-muted/60',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
