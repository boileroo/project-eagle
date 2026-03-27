import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
    s2: 's2-match-play',
    s3: 's3-six-point',
    s4: 's4-wolf',
    s5: 's5-chair',
    s6: 's6-groups',
    s7: 's7-groups-wolf',
    s8: 's8-groups-six-point',
    s9: 's9-groups-match-play',
    s10: 's10-groups-mixed',
    s11: 's11-groups-different-games',
    s12: 's12-best-ball',
    s13: 's13-hi-lo',
    s14: 's14-singles-match-play',
    s15: 's15-rumble',
    s16: 's16-bonuses',
    s17: 's17-multi-format',
    s18: 's18-two-round-individual',
    s19: 's19-two-round-team',
  };
  return idMap[prefix] ?? null;
}

export function ScoresTab({ roundCtx }: ScoresTabProps) {
  const [mode, setMode] = useState<ScoreMode>('random');
  const [filling, setFilling] = useState<string | null>(null);
  const [bulkSubmit] = useBulkSubmitScores();
  const queryClient = useQueryClient();

  const invalidateRoundQueries = useCallback(
    (roundId: string) => {
      void queryClient.invalidateQueries({
        queryKey: ['round', roundId, 'scorecard'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['individual-scoreboard', roundId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['competition', 'round', roundId],
      });
    },
    [queryClient],
  );

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
            invalidateRoundQueries(roundCtx.roundId);
          },
          onError: (error) => toast.error(error.message),
        });
      } finally {
        setFilling(null);
      }
    },
    [roundCtx, bulkSubmit, getScores, invalidateRoundQueries],
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
      invalidateRoundQueries(roundCtx.roundId);
    }
    setFilling(null);
  }, [roundCtx, bulkSubmit, getScores, mode, invalidateRoundQueries]);

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
