import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getTournamentJoinStateFn } from '@/lib/tournaments.server';
import {
  useJoinTournamentByCode,
  type TournamentJoinState,
} from '@/lib/tournaments';
import { JoinOptions } from './components/join-options';

export function JoinPage() {
  const navigate = useNavigate();
  const { code } = useParams({ from: '/join/$code' });
  const [tournament, setTournament] = useState<
    TournamentJoinState['tournament'] | null
  >(null);
  const [joinState, setJoinState] = useState<TournamentJoinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuestPersonId, setSelectedGuestPersonId] = useState<
    string | null
  >(null);
  const [joinTournament, { isPending: joining }] = useJoinTournamentByCode();

  useEffect(() => {
    async function fetchTournament() {
      setLoading(true);
      setError(null);

      try {
        const state = await getTournamentJoinStateFn({ data: { code } });

        setTournament(state.tournament);
        setJoinState(state);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid invite code');
      } finally {
        setLoading(false);
      }
    }

    fetchTournament();
  }, [code]);

  useEffect(() => {
    setSelectedGuestPersonId(null);
  }, [code]);

  const isJoinable =
    tournament?.status === 'setup' || tournament?.status === 'scheduled';

  const claimableGuests = joinState?.claimableGuests ?? [];

  async function handleJoin() {
    setError(null);

    await joinTournament({
      variables: {
        code,
        guestPersonId: selectedGuestPersonId ?? undefined,
      },
      onSuccess: async (result) => {
        await navigate({
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

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Join Tournament</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join a tournament
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tournament ? (
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold">{tournament.name}</p>
            <p className="text-muted-foreground text-sm">
              Status: {tournament.status}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        ) : null}

        {!isJoinable && tournament ? (
          <div className="bg-warning/10 text-warning rounded-md p-3 text-sm">
            This tournament has already started and is not accepting new
            players.
          </div>
        ) : null}

        {isJoinable && joinState?.alreadyJoined ? (
          <div className="space-y-3">
            <div className="rounded-md border p-4 text-center">
              <p className="font-medium">
                You&apos;re already in this tournament.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() =>
                navigate({
                  to: '/tournaments/$tournamentId',
                  params: { tournamentId: tournament!.id },
                })
              }
            >
              Open tournament
            </Button>
          </div>
        ) : null}

        {isJoinable &&
        !joinState?.alreadyJoined &&
        !joinState?.isAuthenticated ? (
          <div className="space-y-3">
            <div className="rounded-md border p-4 text-center text-sm">
              Sign in to join this tournament. If the commissioner already added
              you as a guest, you&apos;ll be able to claim that slot after
              signing in.
            </div>
            <Link
              to="/login"
              search={{ next: `/join/${code}` }}
              className="block"
            >
              <Button className="w-full">Sign in to join</Button>
            </Link>
          </div>
        ) : null}

        {isJoinable &&
        joinState?.isAuthenticated &&
        !joinState?.alreadyJoined ? (
          <JoinOptions
            claimableGuests={claimableGuests}
            selectedGuestPersonId={selectedGuestPersonId}
            joining={joining}
            onSelectGuest={setSelectedGuestPersonId}
            onJoin={handleJoin}
          />
        ) : null}

        {!isJoinable ? (
          <Link to="/">
            <Button variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
