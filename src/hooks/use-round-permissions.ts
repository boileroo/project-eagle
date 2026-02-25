import { useMemo } from 'react';

interface RoundParticipantPerson {
  id: string;
  userId: string | null;
  displayName?: string;
}

interface TournamentParticipantRole {
  role: 'player' | 'commissioner' | 'marker';
  teamMemberships?: Array<{
    team: { id: string; createdAt: Date | string };
  }>;
}

interface RoundParticipant {
  id: string;
  person: RoundParticipantPerson;
  tournamentParticipant?: TournamentParticipantRole | null;
}

interface RoundWithParticipants {
  id: string;
  tournamentId: string;
  status: string;
  participants: RoundParticipant[];
}

interface TournamentParticipant {
  personId: string;
  role: 'player' | 'commissioner' | 'marker';
}

interface TournamentWithParticipants {
  id: string;
  createdByUserId: string;
  participants: TournamentParticipant[];
}

interface UseRoundPermissionsOptions {
  round?: RoundWithParticipants;
  tournament?: TournamentWithParticipants;
  userId: string;
}

export function useRoundPermissions({
  round,
  tournament,
  userId,
}: UseRoundPermissionsOptions) {
  const isCommissioner = useMemo(() => {
    if (!round && !tournament) return false;

    if (tournament) {
      const isCreator = userId === tournament.createdByUserId;
      const isTournamentCommissioner = tournament.participants.some(
        (p) => p.personId && p.role === 'commissioner',
      );
      if (isCreator || isTournamentCommissioner) return true;
    }

    if (round) {
      return round.participants.some(
        (rp) =>
          rp.person.userId === userId &&
          rp.tournamentParticipant?.role === 'commissioner',
      );
    }

    return false;
  }, [round, tournament, userId]);

  const myParticipant = useMemo(() => {
    if (!round) return undefined;
    return round.participants.find((rp) => rp.person.userId === userId);
  }, [round, userId]);

  const myRole = myParticipant?.tournamentParticipant?.role;

  const getRecordingRole = (
    roundParticipantId: string,
  ): 'player' | 'marker' | 'commissioner' => {
    if (isCommissioner) return 'commissioner';
    const rp = round?.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === userId) return 'player';
    return 'marker';
  };

  const editableParticipantIds = useMemo(() => {
    const set = new Set<string>();
    if (!round || round.status !== 'open') return set;

    if (isCommissioner || myRole === 'marker') {
      for (const rp of round.participants) {
        set.add(rp.id);
      }
    } else if (myParticipant) {
      set.add(myParticipant.id);
    }

    return set;
  }, [round, isCommissioner, myRole, myParticipant]);

  const isMarkerOrCommissioner =
    myRole === 'marker' || myRole === 'commissioner';

  return {
    isCommissioner,
    myParticipant,
    myRole,
    getRecordingRole,
    editableParticipantIds,
    isMarkerOrCommissioner,
  };
}
