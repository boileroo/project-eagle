import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useAddPlayer,
  useRemovePlayer,
  useEnsureMyPerson,
} from '@/lib/tournaments';
import { useRemoveRoundParticipant } from '@/lib/rounds';
import { formatHandicapWithFallback } from '@/lib/handicaps';
import { Plus } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { EditHandicapDialog } from '@/components/pages/tournament-detail-page/components/edit-handicap-dialog';
import { ChangeRoleDialog } from '@/components/pages/tournament-detail-page/components/participants/change-role-dialog';
import { LeaveTournamentDialog } from '@/components/pages/tournament-detail-page/components/participants/leave-tournament-dialog';
import { RemoveParticipantDialog } from '@/components/pages/tournament-detail-page/components/participants/remove-participant-dialog';
import { EditRoundHandicapDialog } from '@/components/pages/round-detail-page/components/edit-round-handicap-dialog';
import { RolePill, RolePillButton } from './components/role-pill';
import { HandicapPill, HandicapPillButton } from './components/handicap-pill';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RemoveButton } from '@/components/ui/remove-button';
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

const participantRoleSortOrder: Record<string, number> = {
  commissioner: 0,
  player: 1,
  guest: 2,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getParticipantRole(participant: any, isTournamentMode: boolean) {
  if (participant.person.userId == null) return 'guest';

  return isTournamentMode
    ? participant.role
    : (participant.player?.role ?? 'player');
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

  const [addPlayer] = useAddPlayer();
  const [removePlayer] = useRemovePlayer();
  const [ensureMyPerson] = useEnsureMyPerson();
  const [removeRoundParticipant] = useRemoveRoundParticipant();
  const {
    open: leaveDialogOpen,
    setOpen: setLeaveDialogOpen,
    loading: leaving,
    handleConfirm: handleLeaveConfirm,
  } = useConfirmDialog();
  const [leavingTarget, setLeavingTarget] = useState<{
    playerId: string;
  } | null>(null);
  const {
    open: removeDialogOpen,
    setOpen: setRemoveDialogOpen,
    loading: removing,
    handleConfirm: handleRemoveConfirm,
  } = useConfirmDialog();
  const [removeTarget, setRemoveTarget] = useState<{
    playerId: string;
    name: string;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participants: any[] = isTournamentMode
    ? (tournament?.players ?? [])
    : (round?.players ?? []);

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
      await addPlayer({
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

  const handleRemoveParticipant = async (playerId: string, name: string) => {
    let removeError: Error | null = null;

    if (tournament) {
      await removePlayer({
        variables: { playerId },
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
        variables: { roundPlayerId: playerId },
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
      await removePlayer({
        variables: { playerId: leavingTarget.playerId },
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
      await handleRemoveParticipant(removeTarget.playerId, removeTarget.name);
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
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">
                {displayName}
              </span>
              {p.player?.teamMemberships?.[0]?.team && (
                <Badge variant="secondary" className="text-xs">
                  {p.player.teamMemberships[0].team.name}
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
                  trigger={<RolePillButton role={participantRole} />}
                />
              ) : (
                <RolePill role={participantRole} />
              )}

              {(canEdit || isMe) && isDraft ? (
                isTournamentMode ? (
                  <EditHandicapDialog
                    participant={{
                      id: p.id,
                      handicapOverride: p.handicapOverride,
                    }}
                    onSaved={onChanged}
                    trigger={<HandicapPillButton value={handicapLabel} />}
                  />
                ) : (
                  <EditRoundHandicapDialog
                    roundParticipant={p as RoundData['players'][number]}
                    onSaved={onChanged}
                    trigger={<HandicapPillButton value={handicapLabel} />}
                  />
                )
              ) : (
                <HandicapPill value={handicapLabel} />
              )}

              <RemoveButton
                disabled={!canRemoveThisParticipant}
                className="disabled:pointer-events-none disabled:opacity-0"
                label={`${isMe ? 'Leave' : 'Remove'} ${displayName}`}
                onClick={() => {
                  if (canLeaveSelf) {
                    setLeavingTarget({
                      playerId: p.id,
                    });
                    setLeaveDialogOpen(true);
                    return;
                  }

                  if (tournament) {
                    setRemoveTarget({ playerId: p.id, name: displayName });
                    setRemoveDialogOpen(true);
                    return;
                  }

                  void handleRemoveParticipant(p.id, displayName);
                }}
              />
            </div>
          </div>
        );
      })}

      {isTournamentMode && tournament && canEdit && isDraft && (
        <div className="flex justify-end border-t pt-3">
          <AddPlayerDialog
            trigger={
              <Button
                size="icon-sm"
                className="rounded-full"
                aria-label="Add player"
              >
                <Plus />
              </Button>
            }
            onAddGuest={async (personId, name) => {
              await addPlayer({
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
        </div>
      )}

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
