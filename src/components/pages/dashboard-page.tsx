import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { joinTournamentByCodeFn } from '@/lib/tournaments.server';
import { toast } from 'sonner';

type ActiveRound = {
  roundId: string;
  roundNumber: number | null;
  tournamentId: string;
  tournamentName: string;
  isSingleRound: boolean;
  courseName: string;
  participantCount: number;
  date: Date | null;
  teeTime: string | null;
};

export function DashboardPage({
  userEmail,
  displayName,
  activeRounds,
}: {
  userEmail: string;
  displayName: string | null;
  activeRounds: ActiveRound[];
}) {
  const navigate = useNavigate();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
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
        // Already a member - just redirect
        setJoinDialogOpen(false);
        setJoinCode('');
      } else {
        toast.success(`You've joined ${result.tournamentName}!`);
        setJoinDialogOpen(false);
        setJoinCode('');
      }
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {displayName ?? userEmail}
        </p>
      </div>

      {/* ── Zone 1: Resume (only when active rounds exist) ── */}
      {activeRounds.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            Resume
          </h2>
          {activeRounds.length === 1 ? (
            <Link
              to="/tournaments/$tournamentId/rounds/$roundId"
              params={{
                tournamentId: activeRounds[0].tournamentId,
                roundId: activeRounds[0].roundId,
              }}
              className="group block"
            >
              <Card className="border-primary/40 bg-primary/5 group-hover:bg-primary/10 border-l-4 transition-colors">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-lg font-semibold">
                      {activeRounds[0].courseName}
                      {!activeRounds[0].isSingleRound &&
                        activeRounds[0].roundNumber != null &&
                        ` — Round ${activeRounds[0].roundNumber}`}
                    </p>
                    {!activeRounds[0].isSingleRound && (
                      <p className="text-muted-foreground text-sm">
                        {activeRounds[0].tournamentName}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Live
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <div className="space-y-2">
              {activeRounds.map((round) => (
                <Link
                  key={round.roundId}
                  to="/tournaments/$tournamentId/rounds/$roundId"
                  params={{
                    tournamentId: round.tournamentId,
                    roundId: round.roundId,
                  }}
                  className="group block"
                >
                  <Card className="border-primary/30 group-hover:bg-primary/5 border-l-4 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {round.courseName}
                          {!round.isSingleRound &&
                            round.roundNumber != null &&
                            ` — Round ${round.roundNumber}`}
                        </p>
                        {!round.isSingleRound && (
                          <p className="text-muted-foreground truncate text-sm">
                            {round.tournamentName}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Live
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Zone 2: Start ── */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Start
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/tournaments/new"
            className="group bg-card hover:bg-background rounded-lg border p-6 transition-colors"
          >
            <h3 className="mb-1 font-semibold">New Tournament</h3>
            <p className="text-muted-foreground text-sm">
              Multi-round event with teams, competitions, and standings
            </p>
          </Link>
          <Link
            to="/rounds/new"
            className="group bg-card hover:bg-background rounded-lg border p-6 transition-colors"
          >
            <h3 className="mb-1 font-semibold">Quick Round</h3>
            <p className="text-muted-foreground text-sm">
              Jump straight into a round without tournament setup
            </p>
          </Link>
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
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
                <Button
                  variant="outline"
                  onClick={() => setJoinDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={joining || !joinCode.trim()}
                >
                  {joining ? 'Joining...' : 'Join'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* ── Zone 3: Manage ── */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Manage
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/tournaments"
            className="group bg-card hover:bg-background rounded-lg border p-5 transition-colors"
          >
            <h3 className="mb-1 text-sm font-medium">Events</h3>
            <p className="text-muted-foreground text-xs">
              View all tournaments and rounds
            </p>
          </Link>
          <Link
            to="/courses"
            className="group bg-card hover:bg-background rounded-lg border p-5 transition-colors"
          >
            <h3 className="mb-1 text-sm font-medium">Courses</h3>
            <p className="text-muted-foreground text-xs">
              Browse and manage the course library
            </p>
          </Link>
          <Link
            to="/guests"
            className="group bg-card hover:bg-background rounded-lg border p-5 transition-colors"
          >
            <h3 className="mb-1 text-sm font-medium">Guests</h3>
            <p className="text-muted-foreground text-xs">
              Manage your saved guests
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
