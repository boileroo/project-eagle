import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import {
  getTournamentFn,
  deleteTournamentFn,
  addParticipantFn,
  ensureMyPersonFn,
  lockTournamentFn,
  unlockTournamentFn,
} from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AddParticipantDialog,
  AddRoundDialog,
  RoundsSection,
  StandingsSection,
} from '@/components/tournament-detail';
import { PlayersAndTeamsSection } from '@/components/tournament-detail/players-and-teams-section';
import { CollapsibleSection } from '@/components/tournament-detail/collapsible-section';
import type {
  StandingConfig,
  ComputedStanding,
} from '@/components/tournament-detail/types';

// ──────────────────────────────────────────────
// Tournament Status UI Constants
// ──────────────────────────────────────────────

const tournamentStatusLabels: Record<string, string> = {
  setup: 'Draft',
  scheduled: 'Awaiting Start',
  underway: 'Underway',
  complete: 'Finished',
};

const tournamentStatusColors: Record<
  string,
  'default' | 'secondary' | 'outline' | 'warning'
> = {
  setup: 'outline',
  scheduled: 'secondary',
  underway: 'warning',
  complete: 'default',
};

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TournamentLoaderData = Awaited<ReturnType<typeof getTournamentFn>>;

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────

export function TournamentDetailPage({
  tournament,
  myPerson,
  courses,
  standings,
  computedStandings,
  userId,
}: {
  tournament: TournamentLoaderData;
  myPerson: { id: string } | null;
  courses: {
    id: string;
    name: string;
    location: string | null;
    numberOfHoles: number;
  }[];
  standings: StandingConfig[];
  computedStandings: Record<string, ComputedStanding>;
  userId: string;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createStandingOpen, setCreateStandingOpen] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  const isCreator = userId === tournament.createdByUserId;
  const isCommissioner =
    isCreator ||
    (myPerson
      ? tournament.participants.some(
          (p) => p.personId === myPerson.id && p.role === 'commissioner',
        )
      : false);
  const iAmParticipant = myPerson
    ? tournament.participants.some((p) => p.personId === myPerson.id)
    : false;

  const isSetup = tournament.status === 'setup';
  const isScheduled = tournament.status === 'scheduled';

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTournamentFn({ data: { tournamentId: tournament.id } });
      toast.success('Tournament deleted.');
      navigate({ to: '/tournaments' });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete tournament',
      );
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleAddMyself = async () => {
    try {
      const person = myPerson ?? (await ensureMyPersonFn());
      await addParticipantFn({
        data: {
          tournamentId: tournament.id,
          personId: person.id,
          role:
            isCreator && tournament.participants.length === 0
              ? 'commissioner'
              : 'player',
        },
      });
      toast.success('Added to the tournament!');
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add yourself',
      );
    }
  };

  const handleLock = async () => {
    setLocking(true);
    try {
      await lockTournamentFn({ data: { tournamentId: tournament.id } });
      toast.success('Tournament locked. Rounds are now awaiting start.');
      setLockDialogOpen(false);
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to lock tournament',
      );
    }
    setLocking(false);
  };

  const handleUnlock = async () => {
    setLocking(true);
    try {
      await unlockTournamentFn({ data: { tournamentId: tournament.id } });
      toast.success('Tournament unlocked. Back to draft.');
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to unlock tournament',
      );
    }
    setLocking(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {tournament.name}
          </h1>
          <Badge variant={tournamentStatusColors[tournament.status ?? 'setup']}>
            {tournamentStatusLabels[tournament.status ?? 'setup']}
          </Badge>
        </div>

        {isCommissioner && (
          <div className="flex items-center gap-2">
            {/* Lock / Unlock */}
            {isSetup && tournament.rounds.length > 0 && (
              <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Lock Tournament</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Lock tournament?</DialogTitle>
                    <DialogDescription>
                      All draft rounds will be moved to &quot;scheduled&quot;.
                      Players, teams, and rounds will be locked from editing
                      until you unlock.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setLockDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleLock} disabled={locking}>
                      {locking ? 'Locking…' : 'Lock'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {isScheduled && (
              <Button
                variant="outline"
                onClick={handleUnlock}
                disabled={locking}
              >
                {locking ? 'Unlocking…' : 'Unlock Tournament'}
              </Button>
            )}

            <Button variant="outline" asChild>
              <Link
                to="/tournaments/$tournamentId/edit"
                params={{ tournamentId: tournament.id }}
              >
                Edit
              </Link>
            </Button>

            {isSetup && (
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete tournament?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete{' '}
                      <strong>{tournament.name}</strong> and all its
                      participants, rounds, scores, and competitions. This
                      action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
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
            )}
          </div>
        )}
      </div>

      {tournament.description && (
        <p className="text-muted-foreground">{tournament.description}</p>
      )}

      <Separator />

      {/* Step 1: Players & Teams */}
      <CollapsibleSection
        step={1}
        title="Players & Teams"
        count={tournament.participants.length}
        countLabel="player"
        defaultOpen={true}
        actions={
          isSetup ? (
            <div className="flex items-center gap-2">
              {!iAmParticipant && (
                <Button size="sm" variant="outline" onClick={handleAddMyself}>
                  Join
                </Button>
              )}
              {isCommissioner && (
                <AddParticipantDialog
                  tournamentId={tournament.id}
                  onAdded={() => router.invalidate()}
                />
              )}
            </div>
          ) : undefined
        }
      >
        <PlayersAndTeamsSection
          tournament={tournament}
          isCommissioner={isCommissioner}
          readOnly={!isSetup}
          userId={userId}
          onChanged={() => router.invalidate()}
        />
      </CollapsibleSection>

      {/* Step 2: Rounds */}
      <CollapsibleSection
        step={2}
        title="Rounds"
        count={tournament.rounds.length}
        countLabel="round"
        defaultOpen={tournament.rounds.length > 0}
        actions={
          isCommissioner && isSetup ? (
            <AddRoundDialog
              tournamentId={tournament.id}
              courses={courses}
              onAdded={() => router.invalidate()}
            />
          ) : undefined
        }
      >
        <RoundsSection
          tournament={tournament}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
        />
      </CollapsibleSection>

      {/* Step 3: Standings */}
      <CollapsibleSection
        step={3}
        title="Standings"
        count={standings.length}
        countLabel="standing"
        defaultOpen={standings.length > 0}
        actions={
          isCommissioner ? (
            <Button size="sm" onClick={() => setCreateStandingOpen(true)}>
              Add Standing
            </Button>
          ) : undefined
        }
      >
        <StandingsSection
          tournamentId={tournament.id}
          standings={standings}
          computedStandings={computedStandings}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
          createOpen={createStandingOpen}
          onCreateOpenChange={setCreateStandingOpen}
        />
      </CollapsibleSection>
    </div>
  );
}
