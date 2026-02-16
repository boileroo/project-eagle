import { useState, useCallback } from 'react';
import { searchPersonsFn, createGuestPersonFn } from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

/**
 * Shared dialog for searching existing players and creating guests.
 *
 * Consumers provide:
 * - `tournamentId` — used to scope the search (excludes existing participants)
 * - `onAddPerson` — called when the user clicks "Add" on a search result
 * - `onAddGuest` — called when the user submits the guest form (receives the
 *   newly-created `personId` plus the entered handicap string)
 * - `triggerLabel` — optional button label (defaults to "Add Player")
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
  const [tab, setTab] = useState<'search' | 'guest'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestHandicap, setGuestHandicap] = useState('');

  const resetState = () => {
    setQuery('');
    setResults([]);
    setTab('search');
    setGuestName('');
    setGuestHandicap('');
  };

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
      <DialogTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
          <DialogDescription>
            Search for an existing player or add a guest.
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
            variant={tab === 'guest' ? 'default' : 'outline'}
            onClick={() => setTab('guest')}
          >
            Add Guest
          </Button>
        </div>

        {tab === 'search' ? (
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
                      {person.isGuest && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Guest
                        </Badge>
                      )}
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
                No matches found.{' '}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => {
                    setTab('guest');
                    setGuestName(query);
                  }}
                >
                  Add as guest instead?
                </button>
              </p>
            )}
          </div>
        ) : (
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
