import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { getScoreHistoryFn } from '@/lib/scores.server';

type HistoryEntry = {
  id: string;
  strokes: number;
  recordedByRole: string;
  recordedByName: string;
  createdAt: string | Date;
};

type ScoreHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundParticipantId: string;
  holeNumber: number;
  participantName: string;
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  commissioner: 'default',
  marker: 'secondary',
  player: 'outline',
};

export function ScoreHistoryDialog({
  open,
  onOpenChange,
  roundParticipantId,
  holeNumber,
  participantName,
}: ScoreHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getScoreHistoryFn({
      data: { roundParticipantId, holeNumber },
    })
      .then((data) => setHistory(data as HistoryEntry[]))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, roundParticipantId, holeNumber]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Hole {holeNumber} — {participantName}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Loading…
          </p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No score history.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tabular-nums">
                    {entry.strokes}
                  </span>
                  {idx === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-xs">
                      {entry.recordedByName}
                    </span>
                    <Badge
                      variant={
                        roleBadgeVariant[entry.recordedByRole] ?? 'outline'
                      }
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {entry.recordedByRole}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(entry.createdAt).toLocaleString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
