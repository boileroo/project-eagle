import {
  addParticipantFn,
  removeParticipantFn,
  ensureMyPersonFn,
} from '@/lib/tournaments.server';
import { removeRoundParticipantFn } from '@/lib/rounds.server';
import { X } from 'lucide-react';
import { AddPlayerDialog } from '@/components/add-player-dialog';
import { EditHandicapDialog } from '@/components/tournament-detail/edit-handicap-dialog';
import { EditRoundHandicapDialog } from '@/components/round-detail/edit-round-handicap-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type {
  TournamentData,
  RoundData,
} from '@/components/round-detail/types';

type PlayersTabProps = {
  tournament?: TournamentData;
  round?: RoundData;
  canEdit: boolean;
  userId: string;
  myPerson?: { id: string } | null;
  roundStatus: string;
  onChanged: () => void;
};

export function PlayersTab({
  tournament,
  round,
  canEdit,
  userId,
  myPerson,
  roundStatus,
  onChanged,
}: PlayersTabProps) {
  const isDraft = roundStatus === 'draft';
  const isTournamentMode = !!tournament;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participants: any[] = isTournamentMode
    ? (tournament?.participants ?? [])
    : (round?.participants ?? []);

  const iAmParticipant = myPerson
    ? participants.some((p) => p.person.userId === userId)
    : false;

  const handleAddMyself = async () => {
    if (!tournament) return;
    try {
      const person = myPerson ?? (await ensureMyPersonFn());
      await addParticipantFn({
        data: {
          tournamentId: tournament.id,
          personId: person.id,
          role: 'player',
        },
      });
      toast.success('You joined!');
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join');
    }
  };

  const handleRemoveParticipant = async (
    participantId: string,
    name: string,
  ) => {
    try {
      if (tournament) {
        await removeParticipantFn({ data: { participantId } });
      } else if (round) {
        await removeRoundParticipantFn({
          data: { roundParticipantId: participantId },
        });
      }
      toast.success(`${name} removed.`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove');
    }
  };

  if (participants.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No players yet.
        {tournament && !iAmParticipant && isDraft && (
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
      {participants.map((p) => {
        const personUserId = p.person.userId;
        const displayName = p.person.displayName;
        const handicapValue =
          p.handicapOverride ?? p.handicapSnapshot ?? p.person.currentHandicap;
        const isMe = personUserId === userId;
        const canRemove = canEdit && !isMe;

        return (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2 ${
              isMe ? 'bg-primary/5' : ''
            } ${personUserId == null ? 'border-dashed' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              {isMe && <Badge className="text-xs">You</Badge>}
              {personUserId == null && (
                <Badge variant="outline" className="text-xs">
                  Guest
                </Badge>
              )}
              {p.tournamentParticipant?.teamMemberships?.[0]?.team && (
                <Badge variant="secondary" className="text-xs">
                  {p.tournamentParticipant.teamMemberships[0].team.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
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
                        <Badge variant="outline" className="hover:bg-accent">
                          HC {handicapValue ?? '--'}
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
                        <Badge variant="outline" className="hover:bg-accent">
                          HC {handicapValue ?? '--'}
                        </Badge>
                      </button>
                    }
                  />
                )
              ) : (
                handicapValue != null && (
                  <Badge variant="outline">HC {handicapValue}</Badge>
                )
              )}

              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-6 w-6"
                  aria-label={`Remove ${displayName}`}
                  onClick={() => handleRemoveParticipant(p.id, displayName)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {tournament && !iAmParticipant && isDraft && (
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
          tournamentId={tournament.id}
          onAddPerson={async (person) => {
            await addParticipantFn({
              data: {
                tournamentId: tournament.id,
                personId: person.id,
                role: 'player',
              },
            });
            toast.success('Player added!');
            onChanged();
          }}
          onAddGuest={async (personId, name) => {
            await addParticipantFn({
              data: {
                tournamentId: tournament.id,
                personId,
                role: 'player',
              },
            });
            toast.success(`${name} added!`);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
