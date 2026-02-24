import { useState } from 'react';
import { autoAssignGroupsFn } from '@/lib/groups.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type AutoAssignDialogProps = {
  open: boolean;
  roundId: string;
  participantsCount: number;
  onClose: () => void;
  onAssigned: () => void;
};

export function AutoAssignDialog({
  open,
  roundId,
  participantsCount,
  onClose,
  onAssigned,
}: AutoAssignDialogProps) {
  const [autoAssignSize, setAutoAssignSize] = useState(4);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      await autoAssignGroupsFn({
        data: { roundId, groupSize: autoAssignSize },
      });
      toast.success('Players assigned to groups.');
      onAssigned();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to auto-assign',
      );
    }
    setAutoAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Auto-assign Groups</DialogTitle>
          <DialogDescription>
            Automatically distribute {participantsCount} player
            {participantsCount !== 1 ? 's' : ''} into groups. Existing groups
            will be replaced.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="auto-group-size">Players per group</Label>
          <Input
            id="auto-group-size"
            type="number"
            min={1}
            max={4}
            value={autoAssignSize}
            onChange={(e) =>
              setAutoAssignSize(
                Math.max(1, Math.min(4, parseInt(e.target.value) || 4)),
              )
            }
          />
          <p className="text-muted-foreground text-xs">
            Creates {Math.ceil(participantsCount / autoAssignSize)} group
            {Math.ceil(participantsCount / autoAssignSize) !== 1 ? 's' : ''}.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAutoAssign} disabled={autoAssigning}>
            {autoAssigning ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
