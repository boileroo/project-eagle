import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface BonusModeFieldsProps {
  holeNumber: number;
  bonusMode: 'standalone' | 'contributor';
  bonusPoints: number;
  onHoleNumberChange: (value: number) => void;
  onBonusModeChange: (value: 'standalone' | 'contributor') => void;
  onBonusPointsChange: (value: number) => void;
}

/**
 * Shared "Hole Number + Bonus Mode + conditional Bonus Points" field group
 * used in nearest_pin and longest_drive competition forms.
 */
export function BonusModeFields({
  holeNumber,
  bonusMode,
  bonusPoints,
  onHoleNumberChange,
  onBonusModeChange,
  onBonusPointsChange,
}: BonusModeFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Hole Number</Label>
        <Input
          type="number"
          min={1}
          max={18}
          value={holeNumber}
          onChange={(e) => onHoleNumberChange(parseInt(e.target.value) || 1)}
        />
      </div>

      <div className="space-y-2">
        <Label>Bonus Mode</Label>
        <Select
          value={bonusMode}
          onChange={(e) =>
            onBonusModeChange(e.target.value as 'standalone' | 'contributor')
          }
        >
          <option value="standalone">Standalone (award only)</option>
          <option value="contributor">
            Contributor (contributes to stableford point standings)
          </option>
        </Select>
      </div>

      {bonusMode === 'contributor' && (
        <div className="space-y-2">
          <Label>Bonus Points</Label>
          <Input
            type="number"
            min={0}
            step="0.5"
            value={bonusPoints}
            onChange={(e) =>
              onBonusPointsChange(parseFloat(e.target.value) || 1)
            }
          />
          <p className="text-muted-foreground text-xs">
            Points added to the winner&apos;s individual tournament standing.
          </p>
        </div>
      )}
    </>
  );
}
