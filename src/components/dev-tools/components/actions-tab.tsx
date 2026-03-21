import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { lockTournamentFn, unlockTournamentFn } from '@/lib/tournaments.server';
import { transitionRoundFn } from '@/lib/rounds.server';
import type { RoundContext } from '../dev-tools';

interface ActionsTabProps {
  roundCtx: RoundContext | null;
  router: { invalidate: () => void };
}

export function ActionsTab({ roundCtx, router }: ActionsTabProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const runAction = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      setBusy(key);
      try {
        await fn();
        toast.success(`Done: ${key}`);
        router.invalidate();
      } catch (err) {
        toast.error(`Failed: ${key}`, {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  if (!roundCtx) {
    return (
      <p className="text-muted-foreground text-xs">
        Navigate to a round to see actions.
      </p>
    );
  }

  const isOpen = roundCtx.roundStatus === 'open';
  const isScheduled = roundCtx.roundStatus === 'scheduled';
  const isDraft = roundCtx.roundStatus === 'draft';
  const isFinalized = roundCtx.roundStatus === 'finalized';

  return (
    <div className="space-y-3">
      {/* Lifecycle */}
      <div>
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Tournament Lifecycle
        </p>
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            disabled={busy !== null}
            onClick={() =>
              runAction('Lock Tournament', () =>
                lockTournamentFn({
                  data: { tournamentId: roundCtx.tournamentId },
                }),
              )
            }
          >
            {busy === 'Lock Tournament' ? 'Locking...' : 'Lock Tournament'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            disabled={busy !== null}
            onClick={() =>
              runAction('Unlock Tournament', () =>
                unlockTournamentFn({
                  data: { tournamentId: roundCtx.tournamentId },
                }),
              )
            }
          >
            {busy === 'Unlock Tournament'
              ? 'Unlocking...'
              : 'Unlock Tournament'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Round Lifecycle */}
      <div>
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Round Lifecycle
        </p>
        <div className="space-y-1">
          {isScheduled && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              disabled={busy !== null}
              onClick={() =>
                runAction('Open Round', () =>
                  transitionRoundFn({
                    data: {
                      roundId: roundCtx.roundId,
                      newStatus: 'open',
                    },
                  }),
                )
              }
            >
              {busy === 'Open Round' ? 'Opening...' : 'Open Round'}
            </Button>
          )}
          {isOpen && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              disabled={busy !== null}
              onClick={() =>
                runAction('Finalize Round', () =>
                  transitionRoundFn({
                    data: {
                      roundId: roundCtx.roundId,
                      newStatus: 'finalized',
                    },
                  }),
                )
              }
            >
              {busy === 'Finalize Round' ? 'Finalizing...' : 'Finalize Round'}
            </Button>
          )}
          {isFinalized && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full text-xs"
              disabled={busy !== null}
              onClick={() =>
                runAction('Reopen Round', () =>
                  transitionRoundFn({
                    data: {
                      roundId: roundCtx.roundId,
                      newStatus: 'open',
                    },
                  }),
                )
              }
            >
              {busy === 'Reopen Round' ? 'Reopening...' : 'Reopen Round'}
            </Button>
          )}
          {isDraft && (
            <p className="text-muted-foreground text-[10px]">
              Round is in draft. Lock the tournament first.
            </p>
          )}
        </div>
      </div>

      <Separator />

      <p className="text-muted-foreground text-[10px]">
        More building block actions coming soon (add guests, manage groups,
        quick-add competitions).
      </p>
    </div>
  );
}
