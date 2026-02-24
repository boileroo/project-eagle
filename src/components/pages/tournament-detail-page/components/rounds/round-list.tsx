import { Link, useNavigate } from '@tanstack/react-router';
import { reorderRoundsFn } from '@/lib/rounds.server';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  statusColors,
  statusLabels,
} from '@/components/round-detail/constants';

type RoundItemType = {
  id: string;
  roundNumber: number | null;
  date: string | Date | null;
  teeTime: string | null;
  status: string;
  course: { id: string; name: string } | null;
};

type RoundListProps = {
  tournamentId: string;
  rounds: RoundItemType[];
  isCommissioner: boolean;
  onChanged: () => void;
};

export function RoundList({
  tournamentId,
  rounds,
  isCommissioner,
  onChanged,
}: RoundListProps) {
  const navigate = useNavigate();

  const getDateTime = (r: {
    date: string | Date | null;
    teeTime: string | null;
  }) => {
    if (!r.date) return null;
    const d = new Date(r.date);
    if (r.teeTime) {
      const [h, m] = r.teeTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d.getTime();
  };

  const canSwap = (idxA: number, idxB: number) => {
    const a = rounds[idxA];
    const b = rounds[idxB];
    const aTime = getDateTime(a);
    const bTime = getDateTime(b);
    if (aTime != null && bTime != null) {
      return idxA < idxB ? bTime <= aTime : aTime <= bTime;
    }
    const swapped = [...rounds];
    [swapped[Math.min(idxA, idxB)], swapped[Math.max(idxA, idxB)]] = [
      swapped[Math.max(idxA, idxB)],
      swapped[Math.min(idxA, idxB)],
    ];
    const datedInOrder = swapped.filter((r) => r.date != null);
    for (let i = 1; i < datedInOrder.length; i++) {
      const prev = getDateTime(datedInOrder[i - 1])!;
      const curr = getDateTime(datedInOrder[i])!;
      if (prev > curr) return false;
    }
    return true;
  };

  const canMoveUp = (idx: number) => idx > 0 && canSwap(idx, idx - 1);
  const canMoveDown = (idx: number) =>
    idx < rounds.length - 1 && canSwap(idx, idx + 1);
  const showArrows = rounds.length > 1;

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const ids = rounds.map((r) => r.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    try {
      await reorderRoundsFn({
        data: { tournamentId, roundIds: ids },
      });
      toast.success('Round order updated.');
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= rounds.length - 1) return;
    const ids = rounds.map((r) => r.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    try {
      await reorderRoundsFn({
        data: { tournamentId, roundIds: ids },
      });
      toast.success('Round order updated.');
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder');
    }
  };

  const formatDateTime = (r: {
    date: string | Date | null;
    teeTime: string | null;
  }) => {
    if (!r.date) return null;
    const d = new Date(r.date);
    const datePart = d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    if (r.teeTime) {
      return `${datePart} · ${r.teeTime}`;
    }
    return datePart;
  };

  if (rounds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No rounds yet. Add a round to get started.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rounds.map((r, idx) => (
        <div key={r.id} className="flex items-center gap-2">
          {isCommissioner && showArrows && (
            <div className="flex w-4 flex-col items-center">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground px-0.5 text-xs leading-none disabled:opacity-25"
                disabled={!canMoveUp(idx)}
                onClick={() => handleMoveUp(idx)}
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground px-0.5 text-xs leading-none disabled:opacity-25"
                disabled={!canMoveDown(idx)}
                onClick={() => handleMoveDown(idx)}
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
          )}
          <Link
            to="/tournaments/$tournamentId/rounds/$roundId"
            params={{
              tournamentId,
              roundId: r.id,
            }}
            className="hover:bg-background group flex flex-1 items-center justify-between rounded-md border px-3 py-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Round {idx + 1}</span>
              {r.course && (
                <span
                  role="link"
                  className="text-muted-foreground hover:text-primary cursor-pointer text-sm hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void navigate({
                      to: '/courses/$courseId',
                      params: { courseId: r.course!.id },
                    });
                  }}
                >
                  @ {r.course.name}
                </span>
              )}
              {formatDateTime(r) && (
                <span className="text-muted-foreground text-xs">
                  · {formatDateTime(r)}
                </span>
              )}
            </div>
            <Badge variant={statusColors[r.status] ?? 'outline'}>
              {statusLabels[r.status] ?? r.status}
            </Badge>
          </Link>
        </div>
      ))}
    </div>
  );
}
