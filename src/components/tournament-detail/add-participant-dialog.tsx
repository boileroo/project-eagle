import { useState, useCallback } from 'react';
import {
  searchPersonsFn,
  addParticipantFn,
  createGuestPersonFn,
} from '@/lib/tournaments.server';
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

export function AddParticipantDialog({
  tournamentId,
  onAdded,
}: {
  tournamentId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'search' | 'guest'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    {
      id: string;
      displayName: string;
      currentHandicap: string | null;
      isGuest: boolean;
      email: string | null;
    }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestHandicap, setGuestHandicap] = useState('');

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

  const handleAddPerson = async (personId: string) => {
    setAdding(true);
    try {
      await addParticipantFn({
        data: { tournamentId, personId, role: 'player' },
      });
      toast.success('Player added!');
      setOpen(false);
      setQuery('');
      setResults([]);
      onAdded();
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
        data: {
          displayName: guestName,
          currentHandicap: hc,
        },
      });
      await addParticipantFn({
        data: { tournamentId, personId, role: 'player' },
      });
      toast.success(`${guestName} added as a guest!`);
      setOpen(false);
      setGuestName('');
      setGuestHandicap('');
      onAdded();
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
        if (!v) {
          setQuery('');
          setResults([]);
          setTab('search');
          setGuestName('');
          setGuestHandicap('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add Player</Button>
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
                      onClick={() => handleAddPerson(person.id)}
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
              <Label htmlFor="guestName">Name</Label>
              <Input
                id="guestName"
                placeholder="e.g. Dave Smith"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="guestHandicap">Handicap (optional)</Label>
              <Input
                id="guestHandicap"
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
