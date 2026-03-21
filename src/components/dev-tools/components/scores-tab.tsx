import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBulkSubmitScores } from '@/lib/scores';
import { DETERMINISTIC_SCORES } from '@/lib/dev/scenario-scores';
import type { RoundContext } from '../dev-tools';

type ScoreMode = 'random' | 'deterministic';

interface ScoresTabProps {
  roundCtx: RoundContext | null;
  router: { invalidate: () => void };
}

function generateScore(par: number): number {
  const r = Math.random();
  let strokes: number;
  if (r < 0.05) strokes = par - 2;
  else if (r < 0.2) strokes = par - 1;
  else if (r < 0.55) strokes = par;
  else if (r < 0.85) strokes = par + 1;
  else if (r < 0.95) strokes = par + 2;
  else strokes = par + 3;
  return Math.max(1, strokes);
}

function detectScenarioId(tournamentName: string): string | null {
  const match = tournamentName.match(/^DEV — (S\d+)/i);
  if (!match) return null;
  const prefix = match[1].toLowerCase();
  const idMap: Record<string, string> = {
    s1: 's1-stableford',
    s2: 's2-stroke-play',
    s3: 's3-match-play',
    s4: 's4-six-point',
    s5: 's5-wolf',
    s6: 's6-chair',
    s7: 's7-groups',
    s8: 's8-best-ball',
    s9: 's9-hi-lo',
    s10: 's10-rumble',
    s11: 's11-bonuses',
    s12: 's12-multi-format',
    s13: 's13-two-round-individual',
    s14: 's14-two-round-team',
  };
  return idMap[prefix] ?? null;
}

export function ScoresTab({ roundCtx, router }: ScoresTabProps) {
  const [mode, setMode] = useState<ScoreMode>('random');
  const [filling, setFilling] = useState<string | null>(null);
  const [bulkSubmit] = useBulkSubmitScores();

  const scenarioId = roundCtx
    ? detectScenarioId(roundCtx.tournamentName)
    : null;
  const hasDeterministic = scenarioId
    ? !!DETERMINISTIC_SCORES[scenarioId]
    : false;

  const getScores = useCallback(
    (playerIndex: number): Array<{ holeNumber: number; strokes: number }> => {
      if (!roundCtx) return [];

      if (mode === 'deterministic' && scenarioId) {
        const scoresets = DETERMINISTIC_SCORES[scenarioId];
        if (scoresets && scoresets[0] && scoresets[0][playerIndex]) {
          return scoresets[0][playerIndex].map((strokes, i) => ({
            holeNumber: i + 1,
            strokes,
          }));
        }
      }

      return roundCtx.holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        strokes: generateScore(hole.par),
      }));
    },
    [roundCtx, mode, scenarioId],
  );

  const handleFillOne = useCallback(
    async (participantId: string, playerIndex: number) => {
      if (!roundCtx) return;
      setFilling(participantId);
      try {
        await bulkSubmit({
          variables: {
            roundId: roundCtx.roundId,
            roundParticipantId: participantId,
            scores: getScores(playerIndex),
          },
          onSuccess: () => {
            const p = roundCtx.participants.find(
              (pp) => pp.id === participantId,
            );
            toast.success(`Filled: ${p?.person.displayName ?? 'player'}`);
            router.invalidate();
          },
          onError: (error) => toast.error(error.message),
        });
      } finally {
        setFilling(null);
      }
    },
    [roundCtx, router, bulkSubmit, getScores],
  );

  const handleFillAll = useCallback(async () => {
    if (!roundCtx) return;
    setFilling('__all__');
    let anyError = false;
    for (let i = 0; i < roundCtx.participants.length; i++) {
      const p = roundCtx.participants[i];
      await bulkSubmit({
        variables: {
          roundId: roundCtx.roundId,
          roundParticipantId: p.id,
          scores: getScores(i),
        },
        onError: (error) => {
          anyError = true;
          toast.error(error.message);
        },
      });
      if (anyError) break;
    }
    if (!anyError) {
      toast.success(
        `Filled all ${roundCtx.participants.length} scorecards (${mode})`,
      );
      router.invalidate();
    }
    setFilling(null);
  }, [roundCtx, router, bulkSubmit, getScores, mode]);

  if (!roundCtx) {
    return (
      <p className="text-muted-foreground text-xs">
        Navigate to a round to fill scores.
      </p>
    );
  }

  if (roundCtx.roundStatus !== 'open') {
    return (
      <p className="text-muted-foreground text-xs">
        Round must be <strong>open</strong> to fill scores.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div>
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
          Score Mode
        </p>
        <div className="flex gap-1">
          <Button
            variant={mode === 'random' ? 'default' : 'outline'}
            size="sm"
            className="h-6 flex-1 text-[10px]"
            onClick={() => setMode('random')}
          >
            Random
          </Button>
          <Button
            variant={mode === 'deterministic' ? 'default' : 'outline'}
            size="sm"
            className="h-6 flex-1 text-[10px]"
            disabled={!hasDeterministic}
            onClick={() => setMode('deterministic')}
            title={
              hasDeterministic
                ? 'Use pre-built scores for known outcomes'
                : 'No deterministic scores for this scenario'
            }
          >
            Deterministic
          </Button>
        </div>
      </div>

      <Separator />

      {/* Per-player buttons */}
      <div>
        <p className="mb-1.5 text-xs font-medium">Fill Scorecard</p>
        <div className="space-y-1">
          {roundCtx.participants.map((p, i) => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              className="h-7 w-full justify-between text-xs"
              disabled={filling !== null}
              onClick={() => handleFillOne(p.id, i)}
            >
              <span>
                {filling === p.id ? (
                  <span className="animate-pulse">Filling...</span>
                ) : (
                  p.person.displayName
                )}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                HC {p.handicapSnapshot}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Bulk fill */}
      <Button
        variant="default"
        size="sm"
        className="h-7 w-full text-xs"
        disabled={filling !== null}
        onClick={handleFillAll}
      >
        {filling === '__all__' ? (
          <span className="animate-pulse">Filling all...</span>
        ) : (
          `Fill All — ${mode === 'deterministic' ? 'Deterministic' : 'Random'} (${roundCtx.participants.length}p)`
        )}
      </Button>
    </div>
  );
}
