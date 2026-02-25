import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { updateGuestFn } from '@/lib/tournaments.server';
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

interface Guest {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
}

interface EditGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
}

export function EditGuestDialog({
  open,
  onOpenChange,
  guest,
}: EditGuestDialogProps) {
  const router = useRouter();
  const [editName, setEditName] = useState(guest?.displayName ?? '');
  const [editHandicap, setEditHandicap] = useState(
    guest?.currentHandicap ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setEditName(guest?.displayName ?? '');
      setEditHandicap(guest?.currentHandicap ?? '');
    }
    onOpenChange(v);
  };

  async function handleSaveEdit() {
    if (!guest || !editName.trim()) return;
    setSaving(true);
    try {
      await updateGuestFn({
        data: {
          personId: guest.id,
          displayName: editName.trim(),
          currentHandicap: editHandicap ? parseFloat(editHandicap) : null,
        },
      });
      toast.success('Guest updated');
      handleOpenChange(false);
      router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Guest</DialogTitle>
          <DialogDescription>
            Update guest details for future tournaments
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="editName">Name</Label>
            <Input
              id="editName"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="editHandicap">Handicap</Label>
            <Input
              id="editHandicap"
              type="number"
              step="0.1"
              value={editHandicap}
              onChange={(e) => setEditHandicap(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={saving || !editName.trim()}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
