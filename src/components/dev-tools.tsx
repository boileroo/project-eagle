import { useState, useCallback } from 'react';
import { useMatch, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { bulkSubmitScoresFn } from '@/lib/scores.server';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type RoundParticipant = {
  id: string;
  handicapSnapshot: string;
  person: { displayName: string };
};

type CourseHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
};

type RoundContext = {
  roundId: string;
  roundStatus: string;
  participants: RoundParticipant[];
  holes: CourseHole[];
};

// ──────────────────────────────────────────────
// Score generation
// ──────────────────────────────────────────────

/**
 * Generate realistic random scores for a player.
 * Scores cluster around par with occasional birdies/bogeys/doubles.
 *
 * Distribution (approximate, per hole):
 *  - 5% eagle-or-better (par - 2, min 1)
 *  - 15% birdie (par - 1)
 *  - 35% par
 *  - 30% bogey (par + 1)
 *  - 10% double bogey (par + 2)
 *  - 5% triple+ (par + 3)
 */
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

// ──────────────────────────────────────────────
// Hook: extract round context from the route
// ──────────────────────────────────────────────

function useRoundContext(): RoundContext | null {
  // Try to match the round detail route
  const match = useMatch({
    from: '/_app/tournaments/$tournamentId/rounds/$roundId/',
    shouldThrow: false,
  });

  if (!match?.loaderData) return null;

  const { round } = match.loaderData as {
    round: {
      id: string;
      status: string;
      course: {
        holes: Array<{
          holeNumber: number;
          par: number;
          strokeIndex: number;
        }>;
      };
      participants: Array<{
        id: string;
        handicapSnapshot: string;
        person: { displayName: string };
      }>;
    };
  };

  return {
    roundId: round.id,
    roundStatus: round.status,
    participants: round.participants,
    holes: round.course.holes.sort((a, b) => a.holeNumber - b.holeNumber),
  };
}

// ──────────────────────────────────────────────
// DevTools component
// ──────────────────────────────────────────────

export function DevTools() {
  const [open, setOpen] = useState(false);
  const [filling, setFilling] = useState<string | null>(null);
  const roundCtx = useRoundContext();
  const router = useRouter();

  const handleFillScorecard = useCallback(
    async (participant: RoundParticipant) => {
      if (!roundCtx) return;

      setFilling(participant.id);
      try {
        const scores = roundCtx.holes.map((hole) => ({
          holeNumber: hole.holeNumber,
          strokes: generateScore(hole.par),
        }));

        await bulkSubmitScoresFn({
          data: {
            roundId: roundCtx.roundId,
            roundParticipantId: participant.id,
            scores,
          },
        });

        toast.success(`Filled scorecard for ${participant.person.displayName}`);
        router.invalidate();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to fill scorecard',
        );
      }
      setFilling(null);
    },
    [roundCtx, router],
  );

  const handleFillAll = useCallback(async () => {
    if (!roundCtx) return;

    setFilling('__all__');
    try {
      for (const participant of roundCtx.participants) {
        const scores = roundCtx.holes.map((hole) => ({
          holeNumber: hole.holeNumber,
          strokes: generateScore(hole.par),
        }));

        await bulkSubmitScoresFn({
          data: {
            roundId: roundCtx.roundId,
            roundParticipantId: participant.id,
            scores,
          },
        });
      }

      toast.success(
        `Filled scorecards for all ${roundCtx.participants.length} players`,
      );
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to fill scorecards',
      );
    }
    setFilling(null);
  }, [roundCtx, router]);

  // Floating toggle button (always visible)
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="z-9999 fixed bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        title="Dev Tools"
      >
        🛠️
      </button>

      {/* Panel */}
      {open && (
        <div className="z-9999 fixed bottom-16 left-4 w-72 rounded-lg border bg-white shadow-xl dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">🛠️ Dev Tools</span>
            <Badge variant="outline" className="text-[10px]">
              DEV
            </Badge>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {/* Round actions */}
            {roundCtx ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Round</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {roundCtx.roundStatus}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {roundCtx.holes.length}h · {roundCtx.participants.length}p
                  </span>
                </div>

                {roundCtx.roundStatus !== 'open' && (
                  <p className="text-muted-foreground text-xs">
                    Round must be <strong>open</strong> to fill scores.
                  </p>
                )}

                {roundCtx.roundStatus === 'open' && (
                  <>
                    <div>
                      <p className="mb-1.5 text-xs font-medium">
                        Fill Scorecard
                      </p>
                      <div className="space-y-1">
                        {roundCtx.participants.map((p) => (
                          <Button
                            key={p.id}
                            variant="outline"
                            size="sm"
                            className="h-7 w-full justify-start text-xs"
                            disabled={filling !== null}
                            onClick={() => handleFillScorecard(p)}
                          >
                            {filling === p.id ? (
                              <span className="animate-pulse">Filling…</span>
                            ) : (
                              p.person.displayName
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 w-full text-xs"
                      disabled={filling !== null}
                      onClick={handleFillAll}
                    >
                      {filling === '__all__' ? (
                        <span className="animate-pulse">Filling all…</span>
                      ) : (
                        `Fill All (${roundCtx.participants.length} players)`
                      )}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Navigate to a round to see actions.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
