import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useAddParticipant,
  useRemoveParticipant,
  useEnsureMyPerson,
} from '@/lib/tournaments';
import { useRemoveRoundParticipant } from '@/lib/rounds';
import { formatHandicapWithFallback } from '@/lib/handicaps';
import { X } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { EditHandicapDialog } from '@/components/pages/tournament-detail-page/components/edit-handicap-dialog';
import { ChangeRoleDialog } from '@/components/pages/tournament-detail-page/components/participants/change-role-dialog';
import { LeaveTournamentDialog } from '@/components/pages/tournament-detail-page/components/participants/leave-tournament-dialog';
import { RemoveParticipantDialog } from '@/components/pages/tournament-detail-page/components/participants/remove-participant-dialog';
import { EditRoundHandicapDialog } from '@/components/pages/round-detail-page/components/edit-round-handicap-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { TournamentLoaderData, RoundData } from '@/types';

type PlayersTabProps = {
  tournament?: TournamentLoaderData;
  round?: RoundData;
  canEdit: boolean;
  userId: string;
  myPerson?: { id: string } | null;
  roundStatus: string;
  onChanged: () => void;
};

const roleBadgeClassNames: Record<string, string> = {
  commissioner:
    'border-indigo-400 bg-indigo-200 text-indigo-950 hover:bg-indigo-200',
  player: 'border-indigo-300 bg-indigo-100 text-indigo-900 hover:bg-indigo-100',
  guest: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50',
};

const participantRoleSortOrder: Record<string, number> = {
  commissioner: 0,
  player: 1,
  guest: 2,
};

function formatRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getParticipantRole(participant: any, isTournamentMode: boolean) {
  if (participant.person.userId == null) return 'guest';

  return isTournamentMode
    ? participant.role
    : (participant.tournamentParticipant?.role ?? 'player');
}

export function PlayersTab({
  tournament,
  round,
  canEdit,
  userId,
  myPerson,
  roundStatus,
  onChanged,
}: PlayersTabProps) {
  const navigate = useNavigate();
  const isDraft = roundStatus === 'draft';
  const isTournamentMode = !!tournament;
  const canJoinOrLeaveInTournament = tournament?.status === 'setup';

  const [addParticipant] = useAddParticipant();
  const [removeParticipant] = useRemoveParticipant();
  const [ensureMyPerson] = useEnsureMyPerson();
  const [removeRoundParticipant] = useRemoveRoundParticipant();
  const {
    open: leaveDialogOpen,
    setOpen: setLeaveDialogOpen,
    loading: leaving,
    handleConfirm: handleLeaveConfirm,
  } = useConfirmDialog();
  const [leavingTarget, setLeavingTarget] = useState<{
    participantId: string;
  } | null>(null);
  const {
    open: removeDialogOpen,
    setOpen: setRemoveDialogOpen,
    loading: removing,
    handleConfirm: handleRemoveConfirm,
  } = useConfirmDialog();
  const [removeTarget, setRemoveTarget] = useState<{
    participantId: string;
    name: string;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participants: any[] = isTournamentMode
    ? (tournament?.participants ?? [])
    : (round?.participants ?? []);

  const iAmParticipant = myPerson
    ? participants.some((p) => p.person.userId === userId)
    : false;

  const sortedParticipants = [...participants].sort((a, b) => {
    const roleOrderA =
      participantRoleSortOrder[getParticipantRole(a, isTournamentMode)] ?? 99;
    const roleOrderB =
      participantRoleSortOrder[getParticipantRole(b, isTournamentMode)] ?? 99;

    if (roleOrderA !== roleOrderB) return roleOrderA - roleOrderB;

    return a.person.displayName.localeCompare(b.person.displayName, undefined, {
      sensitivity: 'base',
    });
  });

  // Compute commissioner count (tournament mode only)
  const commissionerCount = isTournamentMode
    ? participants.filter((p) => getParticipantRole(p, true) === 'commissioner')
        .length
    : 0;

  // Get tournament creator ID (tournament mode only)
  const creatorUserId = isTournamentMode ? tournament?.createdByUserId : null;

  const handleAddMyself = async () => {
    if (!tournament) return;
    try {
      let personId = myPerson?.id;
      if (!personId) {
        // Need to ensure person record exists first
        let resolved = false;
        await ensureMyPerson({
          variables: undefined as void,
          onSuccess: (result) => {
            personId = result.id;
            resolved = true;
          },
          onError: (error) => {
            toast.error(error.message);
          },
        });
        if (!resolved) return;
      }
      await addParticipant({
        variables: {
          tournamentId: tournament.id,
          personId: personId!,
          role: 'player',
        },
        onSuccess: () => {
          toast.success('You joined!');
          onChanged();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join');
    }
  };

  const handleRemoveParticipant = async (
    participantId: string,
    name: string,
  ) => {
    let removeError: Error | null = null;

    if (tournament) {
      await removeParticipant({
        variables: { participantId },
        onSuccess: () => {
          toast.success(`${name} removed.`);
          onChanged();
        },
        onError: (error) => {
          toast.error(error.message);
          removeError = error;
        },
      });
    } else if (round) {
      await removeRoundParticipant({
        variables: { roundParticipantId: participantId },
        onSuccess: () => {
          toast.success(`${name} removed.`);
          onChanged();
        },
        onError: (error) => {
          toast.error(error.message);
          removeError = error;
        },
      });
    }

    if (removeError) {
      throw removeError;
    }
  };

  const handleLeave = async () => {
    if (!leavingTarget) return;

    await handleLeaveConfirm(async () => {
      await removeParticipant({
        variables: { participantId: leavingTarget.participantId },
        onSuccess: () => {
          if (typeof window !== 'undefined' && tournament) {
            window.sessionStorage.setItem(
              `tournament-leave:${tournament.id}`,
              'self',
            );
          }
          toast.success(
            `You left ${tournament?.isSingleRound ? 'the round' : 'the tournament'}.`,
          );
          navigate({ to: '/' });
        },
        onError: (error) => {
          toast.error(error.message);
          throw error;
        },
      });
    });
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;

    await handleRemoveConfirm(async () => {
      await handleRemoveParticipant(
        removeTarget.participantId,
        removeTarget.name,
      );
    });
  };

  if (participants.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No players yet.
        {tournament && !iAmParticipant && canJoinOrLeaveInTournament && (
          <Button
            variant="link"
            size="sm"
            onClick={handleAddMyself}
            className="ml-1 h-auto p-0"
          >
            Join yourself
          </Button>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sortedParticipants.map((p) => {
        const personUserId = p.person.userId;
        const displayName = p.person.displayName;
        const handicapValue =
          p.handicapOverride ?? p.handicapSnapshot ?? p.person.currentHandicap;
        const handicapLabel = formatHandicapWithFallback(handicapValue);
        const isMe = personUserId === userId;

        // Determine participant role
        const participantRole = getParticipantRole(p, isTournamentMode);

        const isCommissionerParticipant = participantRole === 'commissioner';
        const roleBadgeClassName =
          roleBadgeClassNames[participantRole] ?? roleBadgeClassNames.player;
        const isCreator = personUserId === creatorUserId;
        const canLeaveSelf =
          isMe &&
          canJoinOrLeaveInTournament &&
          !isCreator &&
          (!isCommissionerParticipant || commissionerCount > 1);
        const canRemoveOtherParticipant =
          canEdit &&
          canJoinOrLeaveInTournament &&
          !isCommissionerParticipant &&
          !isMe;
        const canRemoveThisParticipant =
          canRemoveOtherParticipant || canLeaveSelf;

        return (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
              isMe ? 'border-primary/25 bg-primary/10' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              {p.tournamentParticipant?.teamMemberships?.[0]?.team && (
                <Badge variant="secondary" className="text-xs">
                  {p.tournamentParticipant.teamMemberships[0].team.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {canEdit && isTournamentMode && participantRole !== 'guest' ? (
                <ChangeRoleDialog
                  participantId={p.id}
                  currentRole={participantRole}
                  playerName={displayName}
                  onRoleChanged={onChanged}
                  isLastCommissioner={
                    isCommissionerParticipant && commissionerCount === 1
                  }
                  isCreator={isCreator}
                  trigger={
                    <button type="button" className="cursor-pointer">
                      <Badge className={`text-xs ${roleBadgeClassName}`}>
                        {formatRoleLabel(participantRole)}
                      </Badge>
                    </button>
                  }
                />
              ) : (
                <Badge className={`text-xs ${roleBadgeClassName}`}>
                  {formatRoleLabel(participantRole)}
                </Badge>
              )}

              {canEdit || isMe ? (
                isTournamentMode ? (
                  <EditHandicapDialog
                    participant={{
                      id: p.id,
                      handicapOverride: p.handicapOverride,
                    }}
                    onSaved={onChanged}
                    trigger={
                      <button type="button" className="cursor-pointer">
                        <Badge
                          variant="outline"
                          className="hover:bg-accent min-w-16 justify-center tabular-nums"
                        >
                          HC {handicapLabel}
                        </Badge>
                      </button>
                    }
                  />
                ) : (
                  <EditRoundHandicapDialog
                    roundParticipant={p as RoundData['participants'][number]}
                    onSaved={onChanged}
                    trigger={
                      <button type="button" className="cursor-pointer">
                        <Badge
                          variant="outline"
                          className="hover:bg-accent min-w-16 justify-center tabular-nums"
                        >
                          HC {handicapLabel}
                        </Badge>
                      </button>
                    }
                  />
                )
              ) : (
                <Badge
                  variant="outline"
                  className="min-w-16 justify-center tabular-nums"
                >
                  HC {handicapLabel}
                </Badge>
              )}

              <Button
                variant="ghost"
                size="icon"
                disabled={!canRemoveThisParticipant}
                className="text-muted-foreground hover:text-destructive h-6 w-6 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`${isMe ? 'Leave' : 'Remove'} ${displayName}`}
                onClick={() => {
                  if (canLeaveSelf) {
                    setLeavingTarget({
                      participantId: p.id,
                    });
                    setLeaveDialogOpen(true);
                    return;
                  }

                  if (tournament) {
                    setRemoveTarget({ participantId: p.id, name: displayName });
                    setRemoveDialogOpen(true);
                    return;
                  }

                  void handleRemoveParticipant(p.id, displayName);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      {tournament && !iAmParticipant && canJoinOrLeaveInTournament && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddMyself}
          className="mt-2"
        >
          Join
        </Button>
      )}

      {tournament && canEdit && isDraft && (
        <AddPlayerDialog
          onAddGuest={async (personId, name) => {
            await addParticipant({
              variables: {
                tournamentId: tournament.id,
                personId,
                role: 'player',
              },
              onSuccess: () => {
                toast.success(`${name} added!`);
                onChanged();
              },
              onError: (error) => {
                toast.error(error.message);
              },
            });
          }}
        />
      )}

      <LeaveTournamentDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        isSingleRound={!!tournament?.isSingleRound}
        loading={leaving}
        onConfirm={handleLeave}
      />

      <RemoveParticipantDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        participantName={removeTarget?.name ?? 'this player'}
        isSingleRound={!!tournament?.isSingleRound}
        loading={removing}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
