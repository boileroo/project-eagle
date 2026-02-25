import { useState, useCallback, useEffect } from 'react';
import {
  searchPersonsFn,
  createGuestPersonFn,
  getMyGuestsFn,
} from '@/lib/tournaments.server';
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
}: {
  tournamentId: string;
  onAddPerson: (person: PersonSearchResult) => Promise<void>;
  onAddGuest: (
    personId: string,
    name: string,
    handicap: string,
  ) => Promise<void>;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'search' | 'previous' | 'guest'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // Previous guests
  const [previousGuests, setPreviousGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // New guest form
  const [guestName, setGuestName] = useState('');
  const [guestHandicap, setGuestHandicap] = useState('');

  const resetState = () => {
    setQuery('');
    setResults([]);
    setTab('search');
    setGuestName('');
    setGuestHandicap('');
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
      resetState();
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
      resetState();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add player',
      );
    }
    setAdding(false);
  };

  const handleAddGuest = async () => {
    if (guestName.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    setAdding(true);
    try {
      const hc = guestHandicap ? parseFloat(guestHandicap) : null;
      const { personId } = await createGuestPersonFn({
        data: { displayName: guestName, currentHandicap: hc },
      });
      await onAddGuest(personId, guestName, guestHandicap);
      setOpen(false);
      resetState();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add guest',
      );
    }
    setAdding(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
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
          <div className="space-y-3">
            <div>
              <Label htmlFor="addPlayerGuestName">Name</Label>
              <Input
                id="addPlayerGuestName"
                placeholder="e.g. Dave Smith"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="addPlayerGuestHandicap">
                Handicap (optional)
              </Label>
              <Input
                id="addPlayerGuestHandicap"
                type="number"
                step="0.1"
                placeholder="e.g. 18.4"
                value={guestHandicap}
                onChange={(e) => setGuestHandicap(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddGuest} disabled={adding}>
                {adding ? 'Adding…' : 'Add Guest'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
