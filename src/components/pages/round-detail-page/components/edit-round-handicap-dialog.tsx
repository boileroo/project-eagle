import { type ReactNode, useState } from 'react';
import { useUpdateRoundParticipant } from '@/lib/rounds';
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

export function EditRoundHandicapDialog({
  roundParticipant,
  onSaved,
  trigger,
}: {
  roundParticipant: {
    id: string;
    handicapOverride: string | null;
    handicapSnapshot: string;
  };
  onSaved: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(roundParticipant.handicapOverride ?? '');
  const [updateRoundParticipant, { isPending: saving }] =
    useUpdateRoundParticipant();

  const handleSave = async () => {
    const hc = value ? parseFloat(value) : null;
    await updateRoundParticipant({
      variables: {
        roundParticipantId: roundParticipant.id,
        handicapOverride: hc,
      },
      onSuccess: () => {
        toast.success('Handicap override updated.');
        setOpen(false);
        onSaved();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Round Handicap Override</DialogTitle>
          <DialogDescription>
            Override the handicap for this round only. Snapshot from tournament:{' '}
            {roundParticipant.handicapSnapshot}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="number"
          step="0.1"
          placeholder={`Snapshot: ${roundParticipant.handicapSnapshot}`}
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
