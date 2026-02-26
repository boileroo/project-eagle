import { useState, useEffect } from 'react';
import { Link, useRouter, useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getTournamentByInviteCodeFn } from '@/lib/tournaments.server';
import { useJoinTournamentByCode } from '@/lib/tournaments';

export function JoinPage() {
  const router = useRouter();
  const { code } = useParams({ from: '/join/$code' });
  const [tournament, setTournament] = useState<{
    id: string;
    name: string;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinTournament, { isPending: joining }] = useJoinTournamentByCode();

  // Get tournament info on mount
  useEffect(() => {
    async function fetchTournament() {
      try {
        const result = await getTournamentByInviteCodeFn({ data: { code } });
        setTournament(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid invite code');
      } finally {
        setLoading(false);
      }
    }
    fetchTournament();
  }, [code]);

  async function handleJoin() {
    setError(null);

    await joinTournament({
      variables: { code },
      onSuccess: async (result) => {
        // Successfully joined - redirect to tournament
        await router.navigate({
          to: '/tournaments/$tournamentId',
          params: { tournamentId: result.tournamentId },
        });
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error && !tournament) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">
            Invalid Invite Code
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Check tournament status
  const isJoinable =
    tournament?.status === 'setup' || tournament?.status === 'scheduled';

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Join Tournament</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join a tournament
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tournament && (
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold">{tournament.name}</p>
            <p className="text-muted-foreground text-sm">
              Status: {tournament.status}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        {!isJoinable && tournament && (
          <div className="bg-warning/10 text-warning rounded-md p-3 text-sm">
            This tournament has already started and is not accepting new
            players.
          </div>
        )}

        {isJoinable && (
          <>
            <Button onClick={handleJoin} className="w-full" disabled={joining}>
              {joining ? 'Joining...' : 'Join Tournament'}
            </Button>
          </>
        )}

        {!isJoinable && (
          <Link to="/">
            <Button variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
