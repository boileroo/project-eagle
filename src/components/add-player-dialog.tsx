import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { searchPersonsFn, getMyGuestsFn } from '@/lib/tournaments.server';
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

export type PersonSearchResult = {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  isGuest: boolean;
  email: string | null;
};

export type Guest = {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
};

interface AddPlayerDialogProps {
  tournamentId: string;
  onAddPerson: (person: PersonSearchResult) => Promise<void>;
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
 * Three tabs:
 * - Search: Search for registered users (non-guests)
 * - Previous Guests: Add guests you've used before
 * - Add Guest: Create a new guest
 */
export function AddPlayerDialog({
  tournamentId,
  onAddPerson,
  onAddGuest,
  triggerLabel = 'Add Player',
}: AddPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'search' | 'previous' | 'guest'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
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
    setQuery('');
    setResults([]);
    setTab('search');
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

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const data = await searchPersonsFn({
          data: { query: q, tournamentId },
        });
        setResults(data);
      } catch {
        // ignore search errors
      }
      setSearching(false);
    },
    [tournamentId],
  );

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

  const handleAddPerson = async (person: PersonSearchResult) => {
    setAdding(true);
    try {
      await onAddPerson(person);
      setOpen(false);
      resetDialogState();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add player',
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
            Search for a player, add a previous guest, or create a new guest.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === 'search' ? 'default' : 'outline'}
            onClick={() => setTab('search')}
          >
            Search
          </Button>
          <Button
            size="sm"
            variant={tab === 'previous' ? 'default' : 'outline'}
            onClick={() => setTab('previous')}
          >
            Previous Guests
          </Button>
          <Button
            size="sm"
            variant={tab === 'guest' ? 'default' : 'outline'}
            onClick={() => setTab('guest')}
          >
            New Guest
          </Button>
        </div>

        {tab === 'search' && (
          <div className="space-y-3">
            <Input
              placeholder="Search by name…"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {searching && (
              <p className="text-muted-foreground text-sm">Searching…</p>
            )}
            {results.length > 0 && (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {results.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {person.displayName}
                      </span>
                      {person.email && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {person.email}
                        </span>
                      )}
                      {person.currentHandicap && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          HC {person.currentHandicap}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddPerson(person)}
                      disabled={adding}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {query.length >= 2 && results.length === 0 && !searching && (
              <p className="text-muted-foreground text-sm">
                No registered users found. Try a different search or add a
                guest.
              </p>
            )}
          </div>
        )}

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
