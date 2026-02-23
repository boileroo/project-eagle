import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { updateGuestFn, deleteGuestFn } from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type Guest = {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
};

export function GuestsPage({ guests }: { guests: Guest[] }) {
  const router = useRouter();
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [editName, setEditName] = useState('');
  const [editHandicap, setEditHandicap] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSaveEdit() {
    if (!editGuest || !editName.trim()) return;
    setSaving(true);
    try {
      await updateGuestFn({
        data: {
          personId: editGuest.id,
          displayName: editName.trim(),
          currentHandicap: editHandicap ? parseFloat(editHandicap) : null,
        },
      });
      toast.success('Guest updated');
      setEditGuest(null);
      router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteGuest) return;
    setSaving(true);
    try {
      await deleteGuestFn({
        data: { personId: deleteGuest.id },
      });
      toast.success('Guest deleted');
      setDeleteGuest(null);
      router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Guests</h1>
        <p className="text-muted-foreground">
          Manage guests you've added to tournaments
        </p>
      </div>

      {guests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You haven't created any guests yet. Add guests when creating a
              tournament.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {guests.map((guest) => (
            <Card key={guest.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{guest.displayName}</p>
                  <p className="text-muted-foreground text-sm">
                    Handicap: {guest.currentHandicap ?? 'Not set'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditGuest(guest);
                      setEditName(guest.displayName);
                      setEditHandicap(guest.currentHandicap ?? '');
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteGuest(guest)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editGuest} onOpenChange={(v) => !v && setEditGuest(null)}>
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
            <Button variant="outline" onClick={() => setEditGuest(null)}>
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

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteGuest}
        onOpenChange={(v) => !v && setDeleteGuest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guest</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteGuest?.displayName}? This
              will remove them from your list of guests, but their scores in
              existing tournaments will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGuest(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
