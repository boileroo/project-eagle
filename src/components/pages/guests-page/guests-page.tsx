import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EditGuestDialog } from './components/edit-guest-dialog';
import { DeleteGuestDialog } from './components/delete-guest-dialog';

type Guest = {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
};

export function GuestsPage({ guests }: { guests: Guest[] }) {
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Guests</h1>
        <p className="text-muted-foreground">
          Manage guests you&apos;ve added to tournaments
        </p>
      </div>

      {guests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t created any guests yet. Add guests when creating
              a tournament.
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
                    onClick={() => setEditGuest(guest)}
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

      <EditGuestDialog
        open={!!editGuest}
        onOpenChange={(v) => !v && setEditGuest(null)}
        guest={editGuest}
      />

      <DeleteGuestDialog
        open={!!deleteGuest}
        onOpenChange={(v) => !v && setDeleteGuest(null)}
        guest={deleteGuest}
      />
    </div>
  );
}
