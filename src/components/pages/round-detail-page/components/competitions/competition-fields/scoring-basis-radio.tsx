import { Label } from '@/components/ui/label';

interface ScoringBasisRadioProps {
  value: 'stableford' | 'gross' | 'net';
  onChange: (value: 'stableford' | 'gross' | 'net') => void;
  /** HTML name attribute for the radio group — must be unique per page to avoid conflicts */
  name: string;
}

/**
 * Shared "Scoring Basis" radio group (Stableford, Gross Strokes, Net Score)
 * used in the six_point competition form.
 */
export function ScoringBasisRadio({
  value,
  onChange,
  name,
}: ScoringBasisRadioProps) {
  return (
    <div className="space-y-2">
      <Label>Scoring Basis</Label>
      <div className="flex gap-3">
        {(
          [
            { value: 'stableford', label: 'Stableford' },
            { value: 'gross', label: 'Gross Strokes' },
            { value: 'net', label: 'Net Strokes' },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-1.5 text-sm"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
