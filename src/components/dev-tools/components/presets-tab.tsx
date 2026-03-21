import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { SCENARIOS_BY_PHASE, PHASE_LABELS } from '@/lib/dev/scenarios';
import {
  setupScenarioFn,
  teardownScenarioFn,
  teardownAllTestDataFn,
} from '@/lib/dev-tools.server';
import type { ScenarioPreset } from '@/lib/dev/types';
import type { RoundContext } from '../dev-tools';

interface PresetsTabProps {
  roundCtx: RoundContext | null;
  onNavigate: (tournamentId: string, roundId: string) => void;
  router: { invalidate: () => void };
}

export function PresetsTab({ roundCtx, onNavigate, router }: PresetsTabProps) {
  const [running, setRunning] = useState<string | null>(null);
  const [tearingDown, setTearingDown] = useState(false);

  const handleRunPreset = useCallback(
    async (preset: ScenarioPreset) => {
      setRunning(preset.id);
      try {
        const result = await setupScenarioFn({ data: preset });
        toast.success(`Created: ${preset.label}`, {
          description: `Tournament ready. Invite: ${result.inviteCode}`,
        });
        onNavigate(result.tournamentId, result.roundIds[0]);
        router.invalidate();
      } catch (err) {
        toast.error(`Failed: ${preset.label}`, {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setRunning(null);
      }
    },
    [onNavigate, router],
  );

  const handleTeardownCurrent = useCallback(async () => {
    if (!roundCtx) return;
    setTearingDown(true);
    try {
      await teardownScenarioFn({
        data: { tournamentId: roundCtx.tournamentId },
      });
      toast.success('Deleted test tournament');
      router.invalidate();
    } catch (err) {
      toast.error('Teardown failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTearingDown(false);
    }
  }, [roundCtx, router]);

  const handleTeardownAll = useCallback(async () => {
    setTearingDown(true);
    try {
      const result = await teardownAllTestDataFn();
      toast.success(`Deleted ${result.deleted} test tournament(s)`);
      router.invalidate();
    } catch (err) {
      toast.error('Teardown failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTearingDown(false);
    }
  }, [router]);

  const phases = Object.keys(SCENARIOS_BY_PHASE)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      {phases.map((phase) => (
        <div key={phase}>
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            {PHASE_LABELS[phase] ?? `Phase ${phase}`}
          </p>
          <div className="space-y-1">
            {(SCENARIOS_BY_PHASE[phase] ?? []).map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="h-auto w-full justify-start py-1.5 text-left"
                disabled={running !== null || tearingDown}
                onClick={() => handleRunPreset(preset)}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium">
                    {running === preset.id ? (
                      <span className="animate-pulse">Setting up...</span>
                    ) : (
                      preset.label
                    )}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {preset.description}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      ))}

      <Separator />

      <div>
        <p className="text-destructive mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Teardown
        </p>
        <div className="space-y-1">
          {roundCtx && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 h-7 w-full text-xs"
              disabled={tearingDown || running !== null}
              onClick={handleTeardownCurrent}
            >
              {tearingDown ? 'Deleting...' : 'Delete Current Tournament'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 h-7 w-full text-xs"
            disabled={tearingDown || running !== null}
            onClick={handleTeardownAll}
          >
            {tearingDown ? 'Deleting...' : 'Delete All Test Data'}
          </Button>
        </div>
      </div>
    </div>
  );
}
