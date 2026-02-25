import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PointsFieldsProps {
  pointsPerWin: number;
  pointsPerHalf: number;
  onPointsPerWinChange: (value: number) => void;
  onPointsPerHalfChange: (value: number) => void;
  /** When true, changing pointsPerWin auto-sets pointsPerHalf to half the value */
  autoHalf?: boolean;
}

/**
 * Shared "Points per Win / Points per Half" two-column grid used across
 * match_play, best_ball, and hi_lo competition forms.
 */
export function PointsFields({
  pointsPerWin,
  pointsPerHalf,
  onPointsPerWinChange,
  onPointsPerHalfChange,
  autoHalf = true,
}: PointsFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Points per Win</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          value={pointsPerWin}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onPointsPerWinChange(val);
            if (autoHalf) {
              onPointsPerHalfChange(val / 2);
            }
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Points per Half</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          value={pointsPerHalf}
          onChange={(e) =>
            onPointsPerHalfChange(parseFloat(e.target.value) || 0)
          }
        />
      </div>
    </div>
  );
}
