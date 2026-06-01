import { useState } from 'react';
import type { GuestListItem } from '@/types';
import { formatHandicapWithFallback } from '@/lib/handicaps';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { EditGuestDialog } from './components/edit-guest-dialog';
import { DeleteGuestDialog } from './components/delete-guest-dialog';

export function GuestsPage({ guests }: { guests: GuestListItem[] }) {
  const [editGuest, setEditGuest] = useState<GuestListItem | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<GuestListItem | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <Heading level={1}>Guests</Heading>
        <Text size="sm" color="muted">
          Manage guests you&apos;ve added to tournaments
        </Text>
      </div>

      {guests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Text size="sm" color="muted">
              You haven&apos;t created any guests yet. Add guests when creating
              a tournament.
            </Text>
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
                    Handicap:{' '}
                    {formatHandicapWithFallback(
                      guest.currentHandicap,
                      'Not set',
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditGuest(guest)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
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
