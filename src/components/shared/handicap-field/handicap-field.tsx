import { useEffect, useState } from 'react';
import { applyHandicapSign } from '@/lib/handicaps';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface HandicapFieldProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  initialPlusHandicap?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
}

export function HandicapField({
  value,
  onChange,
  initialPlusHandicap = false,
  placeholder = 'e.g. 18.4',
  autoFocus = false,
  inputClassName,
}: HandicapFieldProps) {
  const [emptyPlusHandicap, setEmptyPlusHandicap] =
    useState(initialPlusHandicap);

  useEffect(() => {
    setEmptyPlusHandicap(initialPlusHandicap);
  }, [initialPlusHandicap]);

  const isPlusHandicap = value == null ? emptyPlusHandicap : value < 0;

  const magnitude = value == null ? '' : Math.abs(value).toString();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          max={isPlusHandicap ? '10' : '54'}
          step="0.1"
          placeholder={placeholder}
          value={magnitude}
          onChange={(e) => {
            const nextMagnitude =
              e.target.value === '' ? null : Number.parseFloat(e.target.value);
            onChange(applyHandicapSign(nextMagnitude, isPlusHandicap));
          }}
          autoFocus={autoFocus}
          className={inputClassName}
        />
        <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          <Switch
            checked={isPlusHandicap}
            onCheckedChange={(checked) => {
              setEmptyPlusHandicap(checked);
              onChange(applyHandicapSign(value ?? null, checked));
            }}
            aria-label="Plus handicap"
          />
          <span>Plus handicap</span>
        </label>
      </div>
      {isPlusHandicap && (
        <p className="text-muted-foreground text-xs">
          Uses golf plus format, e.g. +2.1.
        </p>
      )}
    </div>
  );
}
