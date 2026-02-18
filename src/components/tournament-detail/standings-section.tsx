import { useState } from 'react';
import {
  createTournamentStandingFn,
  deleteTournamentStandingFn,
} from '@/lib/competitions.server';
import {
  AGGREGATION_METHOD_LABELS,
  AGGREGATION_METHODS,
  PARTICIPANT_TYPE_LABELS,
  type AggregationConfig,
} from '@/lib/competitions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { StandingConfig, ComputedStanding } from './types';

export function StandingsSection({
  tournamentId,
  standings,
  computedStandings,
  isCommissioner,
  onChanged,
  createOpen,
  onCreateOpenChange,
}: {
  tournamentId: string;
  standings: StandingConfig[];
  computedStandings: Record<string, ComputedStanding>;
  isCommissioner: boolean;
  onChanged: () => void;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [participantType, setParticipantType] = useState<'individual' | 'team'>(
    'individual',
  );
  const [method, setMethod] =
    useState<AggregationConfig['method']>('sum_stableford');
  const [scoringBasis, setScoringBasis] = useState<
    'net_strokes' | 'gross_strokes'
  >('net_strokes');
  const [pointsPerWin, setPointsPerWin] = useState('1');
  const [pointsPerHalf, setPointsPerHalf] = useState('0.5');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const buildAggregationConfig = (): AggregationConfig => {
    switch (method) {
      case 'sum_stableford':
        return { method: 'sum_stableford' };
      case 'lowest_strokes':
        return { method: 'lowest_strokes', config: { scoringBasis } };
      case 'match_wins':
        return {
          method: 'match_wins',
          config: {
            pointsPerWin: parseFloat(pointsPerWin) || 1,
            pointsPerHalf: parseFloat(pointsPerHalf) || 0.5,
          },
        };
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setCreating(true);
    try {
      await createTournamentStandingFn({
        data: {
          tournamentId,
          name: name.trim(),
          participantType,
          aggregationConfig: buildAggregationConfig(),
        },
      });
      toast.success('Standing created!');
      onCreateOpenChange(false);
      setName('');
      setMethod('sum_stableford');
      setParticipantType('individual');
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create standing',
      );
    }
    setCreating(false);
  };

  const handleDelete = async (standingId: string) => {
    setDeleting(true);
    try {
      await deleteTournamentStandingFn({ data: { standingId } });
      toast.success('Standing deleted.');
      setDeleteConfirm(null);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete standing',
      );
    }
    setDeleting(false);
  };

  return (
    <>
      {standings.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No standings configured.
          {isCommissioner &&
            ' Add a standing to create a tournament-wide leaderboard.'}
        </p>
      ) : (
        <div className="space-y-6">
          {standings.map((s) => {
            const computed = computedStandings[s.id];
            const aggConfig = s.aggregationConfig as AggregationConfig;

            return (
              <div key={s.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{s.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {
                        PARTICIPANT_TYPE_LABELS[
                          s.participantType as 'individual' | 'team'
                        ]
                      }
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {AGGREGATION_METHOD_LABELS[aggConfig.method]}
                    </Badge>
                  </div>
                  {isCommissioner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7"
                      onClick={() =>
                        setDeleteConfirm({ id: s.id, name: s.name })
                      }
                    >
                      ✕
                    </Button>
                  )}
                </div>

                {computed && computed.leaderboard.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-3 py-2 text-left font-medium">#</th>
                          <th className="px-3 py-2 text-left font-medium">
                            {s.participantType === 'team' ? 'Team' : 'Player'}
                          </th>
                          {computed.rounds.map((r) => (
                            <th
                              key={r.id}
                              className="px-3 py-2 text-center font-medium"
                              title={r.courseName}
                            >
                              R{r.roundNumber}
                            </th>
                          ))}
                          {computed.leaderboard.some(
                            (e) => e.bonusTotal > 0,
                          ) && (
                            <th className="px-3 py-2 text-center font-medium">
                              Bonus
                            </th>
                          )}
                          <th className="px-3 py-2 text-center font-medium">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {computed.leaderboard.map((entry, idx) => {
                          const hasBonuses = computed.leaderboard.some(
                            (e) => e.bonusTotal > 0,
                          );
                          return (
                            <tr
                              key={entry.entityId}
                              className={
                                idx === 0
                                  ? 'bg-yellow-50 dark:bg-yellow-950/20'
                                  : idx % 2 === 1
                                    ? 'bg-muted/25'
                                    : ''
                              }
                            >
                              <td className="text-muted-foreground px-3 py-1.5">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-1.5 font-medium">
                                {entry.displayName}
                              </td>
                              {computed.rounds.map((r) => {
                                const roundVal = entry.perRound.find(
                                  (pr) => pr.roundId === r.id,
                                );
                                return (
                                  <td
                                    key={r.id}
                                    className="px-3 py-1.5 text-center"
                                  >
                                    {roundVal != null ? roundVal.value : '–'}
                                  </td>
                                );
                              })}
                              {hasBonuses && (
                                <td className="px-3 py-1.5 text-center">
                                  {entry.bonusTotal > 0
                                    ? `+${entry.bonusTotal}`
                                    : '–'}
                                </td>
                              )}
                              <td className="px-3 py-1.5 text-center font-semibold">
                                {entry.total}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : computed ? (
                  <p className="text-muted-foreground text-sm">
                    No results yet. Scores need to be entered in rounds.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Unable to compute standings.
                  </p>
                )}

                {s !== standings[standings.length - 1] && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create standing dialog */}
      {isCommissioner && (
        <Dialog
          open={createOpen}
          onOpenChange={(v) => {
            onCreateOpenChange(v);
            if (!v) {
              setName('');
              setMethod('sum_stableford');
              setParticipantType('individual');
              setScoringBasis('net_strokes');
              setPointsPerWin('1');
              setPointsPerHalf('0.5');
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Standing</DialogTitle>
              <DialogDescription>
                Create a tournament-wide leaderboard that aggregates results
                across rounds.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="standingName">Name</Label>
                <Input
                  id="standingName"
                  placeholder="e.g. Overall Individual, Team Trophy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="standingType">Type</Label>
                <select
                  id="standingType"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={participantType}
                  onChange={(e) =>
                    setParticipantType(e.target.value as 'individual' | 'team')
                  }
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div>
                <Label htmlFor="standingMethod">Aggregation Method</Label>
                <select
                  id="standingMethod"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as AggregationConfig['method'])
                  }
                >
                  {AGGREGATION_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {AGGREGATION_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              {method === 'lowest_strokes' && (
                <div>
                  <Label htmlFor="scoringBasis">Scoring Basis</Label>
                  <select
                    id="scoringBasis"
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    value={scoringBasis}
                    onChange={(e) =>
                      setScoringBasis(
                        e.target.value as 'net_strokes' | 'gross_strokes',
                      )
                    }
                  >
                    <option value="net_strokes">Net Strokes</option>
                    <option value="gross_strokes">Gross Strokes</option>
                  </select>
                </div>
              )}

              {method === 'match_wins' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pointsPerWin">Points per Win</Label>
                    <Input
                      id="pointsPerWin"
                      type="number"
                      step="0.5"
                      min="0"
                      value={pointsPerWin}
                      onChange={(e) => setPointsPerWin(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pointsPerHalf">Points per Half</Label>
                    <Input
                      id="pointsPerHalf"
                      type="number"
                      step="0.5"
                      min="0"
                      value={pointsPerHalf}
                      onChange={(e) => setPointsPerHalf(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete standing confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete standing?</DialogTitle>
            <DialogDescription>
              This will permanently delete the{' '}
              <strong>{deleteConfirm?.name}</strong> standing. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
