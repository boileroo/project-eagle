import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import {
  getTournamentFn,
  deleteTournamentFn,
  addParticipantFn,
  removeParticipantFn,
  updateParticipantFn,
  ensureMyPersonFn,
} from '@/lib/tournaments.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AddParticipantDialog,
  EditHandicapDialog,
  RoundsSection,
  StandingsSection,
  TeamsSection,
} from '@/components/tournament-detail';
import type {
  StandingConfig,
  ComputedStanding,
} from '@/components/tournament-detail/types';

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
  const [showTeams, setShowTeams] = useState(tournament.teams.length > 0);
  const [commissionerConfirm, setCommissionerConfirm] = useState<{
    participantId: string;
    name: string;
  } | null>(null);

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
  const currentCommissioner = tournament.participants.find(
    (p) => p.role === 'commissioner',
  );

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

  const handleRemoveParticipant = async (
    participantId: string,
    name: string,
  ) => {
    try {
      await removeParticipantFn({ data: { participantId } });
      toast.success(`${name} removed from tournament.`);
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove participant',
      );
    }
  };

  const handleRoleChange = async (
    participantId: string,
    role: 'commissioner' | 'marker' | 'player' | 'spectator',
    personName?: string,
  ) => {
    if (
      role === 'commissioner' &&
      currentCommissioner &&
      currentCommissioner.id !== participantId
    ) {
      setCommissionerConfirm({
        participantId,
        name: personName ?? 'this person',
      });
      return;
    }
    await applyRoleChange(participantId, role);
  };

  const applyRoleChange = async (
    participantId: string,
    role: 'commissioner' | 'marker' | 'player' | 'spectator',
  ) => {
    try {
      await updateParticipantFn({ data: { participantId, role } });
      toast.success('Role updated.');
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role',
      );
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

        {isCommissioner && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link
                to="/tournaments/$tournamentId/edit"
                params={{ tournamentId: tournament.id }}
              >
                Edit
              </Link>
            </Button>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
          </div>
        )}
      </div>

      {/* Commissioner change confirmation dialog */}
      <Dialog
        open={commissionerConfirm !== null}
        onOpenChange={(open) => !open && setCommissionerConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change commissioner?</DialogTitle>
            <DialogDescription>
              <strong>{commissionerConfirm?.name}</strong> will become the new
              commissioner.{' '}
              {currentCommissioner && (
                <>
                  <strong>{currentCommissioner.person.displayName}</strong> will
                  be demoted to Player.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCommissionerConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (commissionerConfirm) {
                  await applyRoleChange(
                    commissionerConfirm.participantId,
                    'commissioner',
                  );
                }
                setCommissionerConfirm(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator />

      {/* Participants section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Players</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="tournament-teams-toggle"
                  checked={showTeams}
                  onCheckedChange={setShowTeams}
                  className="scale-75"
                />
                <Label
                  htmlFor="tournament-teams-toggle"
                  className="text-muted-foreground cursor-pointer text-xs font-normal"
                >
                  Teams
                </Label>
              </div>
              <Badge variant="secondary">
                {tournament.participants.length} player
                {tournament.participants.length !== 1 ? 's' : ''}
              </Badge>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No players yet. Add yourself or invite others to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {tournament.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {p.person.displayName}
                    </span>
                    {p.person.userId == null && (
                      <Badge variant="outline" className="text-xs">
                        Guest
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(p.handicapOverride ?? p.person.currentHandicap) !=
                      null && (
                      <Badge variant="outline">
                        HC {p.handicapOverride ?? p.person.currentHandicap}
                      </Badge>
                    )}
                    {isCommissioner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                          >
                            <Badge
                              variant={
                                p.role === 'commissioner'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {p.role}
                            </Badge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(p.person.userId == null
                            ? (['player', 'spectator'] as const)
                            : ([
                                'commissioner',
                                'player',
                                'marker',
                                'spectator',
                              ] as const)
                          ).map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() =>
                                handleRoleChange(
                                  p.id,
                                  role,
                                  p.person.displayName,
                                )
                              }
                              disabled={p.role === role}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                              {p.role === role ? ' ✓' : ''}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <EditHandicapDialog
                            participant={p}
                            onSaved={() => router.invalidate()}
                          />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              handleRemoveParticipant(
                                p.id,
                                p.person.displayName,
                              )
                            }
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {!isCommissioner && (
                      <Badge
                        variant={
                          p.role === 'commissioner' ? 'default' : 'secondary'
                        }
                      >
                        {p.role}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Teams section — shown when toggle is on */}
      {showTeams && (
        <TeamsSection
          tournament={tournament}
          isCommissioner={isCommissioner}
          onChanged={() => router.invalidate()}
        />
      )}

      {/* Rounds section */}
      <RoundsSection
        tournament={tournament}
        courses={courses}
        isCommissioner={isCommissioner}
        onChanged={() => router.invalidate()}
      />

      {/* Standings section */}
      <StandingsSection
        tournamentId={tournament.id}
        standings={standings}
        computedStandings={computedStandings}
        isCommissioner={isCommissioner}
        onChanged={() => router.invalidate()}
      />
    </div>
  );
}
