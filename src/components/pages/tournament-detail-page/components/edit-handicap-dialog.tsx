import { type ReactNode, useState } from 'react';
import { useUpdateParticipant } from '@/lib/tournaments';
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
  const [updateParticipant, { isPending }] = useUpdateParticipant();

  const handleSave = async () => {
    const hc = value ? parseFloat(value) : null;
    await updateParticipant({
      variables: { participantId: participant.id, handicapOverride: hc },
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
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
