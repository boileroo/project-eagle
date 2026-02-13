import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { getTournamentFn, deleteTournamentFn } from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks';

export const Route = createFileRoute('/_app/tournaments/$tournamentId/')({
  loader: async ({ params }) => {
    const tournament = await getTournamentFn({
      data: { tournamentId: params.tournamentId },
    });
    return { tournament };
  },
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const { tournament } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOwner = user?.id === tournament.createdByUserId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournamentFn({
        data: { tournamentId: tournament.id },
      });
      toast.success('Tournament deleted.');
      navigate({ to: '/tournaments' });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete tournament',
      );
      setDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="text-muted-foreground mt-1">
              {tournament.description}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link
                to="/tournaments/$tournamentId/edit"
                params={{ tournamentId: tournament.id }}
              >
                Edit
              </Link>
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete tournament?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete{' '}
                    <strong>{tournament.name}</strong> and all its participants,
                    rounds, scores, and competitions. This action cannot be
                    undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Separator />

      {/* Participants section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Players</span>
            <Badge variant="secondary">
              {tournament.participants.length} player
              {tournament.participants.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No players yet. Add players to this tournament to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {tournament.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {p.person.displayName}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.handicapOverride != null && (
                      <Badge variant="outline">
                        HC {p.handicapOverride}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        p.role === 'commissioner' ? 'default' : 'secondary'
                      }
                    >
                      {p.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rounds section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rounds</span>
            <Badge variant="secondary">
              {tournament.rounds.length} round
              {tournament.rounds.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.rounds.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No rounds yet. Create rounds once players are added.
            </p>
          ) : (
            <div className="space-y-2">
              {tournament.rounds.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Round {r.roundNumber ?? '—'}
                    </span>
                    {r.course && (
                      <span className="text-muted-foreground text-sm">
                        @ {r.course.name}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={r.status === 'finalized' ? 'default' : 'outline'}
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
