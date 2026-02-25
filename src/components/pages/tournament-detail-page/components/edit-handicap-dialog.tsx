import { type ReactNode, useState } from 'react';
import { updateParticipantFn } from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function EditHandicapDialog({
  participant,
  onSaved,
  trigger,
}: {
  participant: { id: string; handicapOverride: string | null };
  onSaved: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(participant.handicapOverride ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const hc = value ? parseFloat(value) : null;
      await updateParticipantFn({
        data: { participantId: participant.id, handicapOverride: hc },
      });
      toast.success('Handicap override updated.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update handicap',
      );
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Handicap Override</DialogTitle>
          <DialogDescription>
            Set a tournament-specific handicap. Leave blank to use the
            player&apos;s current handicap.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="number"
          step="0.1"
          placeholder="e.g. 18.4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
