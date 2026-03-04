import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getMyGuestsFn } from '@/lib/tournaments.server';
import { useCreateGuestPerson } from '@/lib/tournaments';
import { createGuestSchema, type CreateGuestInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

export type Guest = {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
};

interface AddPlayerDialogProps {
  onAddGuest: (
    personId: string,
    name: string,
    handicap: string,
  ) => Promise<void>;
  triggerLabel?: string;
}

/**
 * Shared dialog for adding players to a tournament.
 *
 * Two tabs:
 * - Previous Guests: Add guests you've used before
 * - New Guest: Create a new guest
 *
 * Note: User search functionality has been removed to prevent exposing email addresses.
 */
export function AddPlayerDialog({
  onAddGuest,
  triggerLabel = 'Add Player',
}: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'previous' | 'guest'>('previous');
  const [adding, setAdding] = useState(false);

  // Previous guests
  const [previousGuests, setPreviousGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  const [createGuestPerson] = useCreateGuestPerson();

  // Guest form with RHF
  const guestForm = useForm<CreateGuestInput>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      displayName: '',
      currentHandicap: null,
    },
  });

  const resetDialogState = () => {
    setTab('previous');
    guestForm.reset();
  };

  // Load previous guests when switching to that tab
  useEffect(() => {
    if (tab === 'previous' && previousGuests.length === 0) {
      setLoadingGuests(true);
      getMyGuestsFn()
        .then(setPreviousGuests)
        .finally(() => setLoadingGuests(false));
    }
  }, [tab, previousGuests.length]);

  const handleAddPreviousGuest = async (guest: Guest) => {
    setAdding(true);
    try {
      await onAddGuest(
        guest.id,
        guest.displayName,
        guest.currentHandicap ?? '',
      );
      setOpen(false);
      resetDialogState();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add guest',
      );
    }
    setAdding(false);
  };

  const handleAddGuest = async (data: CreateGuestInput) => {
    setAdding(true);
    await createGuestPerson({
      variables: data,
      onSuccess: async (result) => {
        try {
          await onAddGuest(
            result.personId,
            data.displayName,
            data.currentHandicap?.toString() ?? '',
          );
          setOpen(false);
          resetDialogState();
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Failed to add guest',
          );
        }
        setAdding(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setAdding(false);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetDialogState();
      }}
    >
      <div className="mt-2 flex justify-end">
        <DialogTrigger asChild>
          <Button size="sm">{triggerLabel}</Button>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
          <DialogDescription>
            Add a previous guest or create a new guest.
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons with better styling */}
        <div className="flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setTab('previous')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'previous'
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Previous Guests
          </button>
          <button
            type="button"
            onClick={() => setTab('guest')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'guest'
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            New Guest
          </button>
        </div>

        {tab === 'previous' && (
          <div className="space-y-3">
            {loadingGuests ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : previousGuests.length > 0 ? (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {previousGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {guest.displayName}
                      </span>
                      {guest.currentHandicap && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          HC {guest.currentHandicap}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPreviousGuest(guest)}
                      disabled={adding}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No previous guests. Create a new guest to add them to this
                tournament.
              </p>
            )}
          </div>
        )}

        {tab === 'guest' && (
          <Form {...guestForm}>
            <form
              onSubmit={guestForm.handleSubmit(handleAddGuest)}
              className="space-y-3"
            >
              <FormField
                control={guestForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Dave Smith"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={guestForm.control}
                name="currentHandicap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handicap</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 18.4"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={adding}>
                  {adding ? 'Adding…' : 'Add Guest'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
