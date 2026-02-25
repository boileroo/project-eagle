import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { joinTournamentByCodeFn } from '@/lib/tournaments.server';
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

interface JoinTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTournamentDialog({
  open,
  onOpenChange,
}: JoinTournamentDialogProps) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);

    try {
      const result = await joinTournamentByCodeFn({
        data: { code: joinCode.trim() },
      });
      if (result.alreadyJoined) {
        setJoinCode('');
      } else {
        toast.success(`You've joined ${result.tournamentName}!`);
        setJoinCode('');
      }
      onOpenChange(false);
      navigate({
        to: '/tournaments/$tournamentId',
        params: { tournamentId: result.tournamentId },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to join tournament',
      );
    } finally {
      setJoining(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="group bg-card hover:bg-background w-full rounded-lg border p-6 text-left transition-colors">
          <h3 className="mb-1 font-semibold">Join Tournament</h3>
          <p className="text-muted-foreground text-sm">
            Enter a code to join an existing tournament
          </p>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Tournament</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by the tournament commissioner
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="e.g. BIRDIE-12b7"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
            {joining ? 'Joining...' : 'Join'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
