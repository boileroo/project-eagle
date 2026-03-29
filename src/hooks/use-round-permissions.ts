import { useMemo } from 'react';
import { useDevRoleOverride } from '@/lib/dev/role-override';

interface RoundParticipantPerson {
  id: string;
  userId: string | null;
  displayName?: string;
}

interface TournamentParticipantRole {
  role: 'player' | 'commissioner';
  teamMemberships?: Array<{
    team: { id: string; createdAt: Date | string };
  }>;
}

interface RoundParticipant {
  id: string;
  roundGroupId?: string | null;
  isMarker?: boolean;
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
  person?: { userId: string | null };
  role: 'player' | 'commissioner';
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
        (p) => p.role === 'commissioner' && p.person?.userId === userId,
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

  const isRoundMarker = myParticipant?.isMarker === true;

  const getRecordingRole = (
    roundParticipantId: string,
  ): 'player' | 'marker' | 'commissioner' => {
    const rp = round?.participants.find((p) => p.id === roundParticipantId);
    if (rp?.person.userId === userId) return 'player';
    if (isCommissioner) return 'commissioner';
    return 'marker';
  };

  const editableParticipantIds = useMemo(() => {
    const set = new Set<string>();
    if (!round || round.status !== 'open') return set;

    if (isCommissioner) {
      for (const rp of round.participants) {
        set.add(rp.id);
      }
    } else if (isRoundMarker) {
      // Marker can only edit participants in their own group
      const myGroupId = myParticipant?.roundGroupId;
      for (const rp of round.participants) {
        if (myGroupId && rp.roundGroupId === myGroupId) {
          set.add(rp.id);
        } else if (!myGroupId) {
          // If marker has no group assigned, fall back to all participants
          set.add(rp.id);
        }
      }
    } else if (myParticipant) {
      set.add(myParticipant.id);
    }

    return set;
  }, [round, isCommissioner, isRoundMarker, myParticipant]);

  const isMarkerOrCommissioner = isRoundMarker || isCommissioner;

  const devOverride = useDevRoleOverride();

  if (devOverride && round) {
    const overriddenIsCommissioner = devOverride === 'commissioner';
    const overriddenIsMarker = devOverride === 'marker';

    const overriddenEditableIds = new Set<string>();
    if (round.status === 'open') {
      if (overriddenIsCommissioner) {
        for (const rp of round.participants) overriddenEditableIds.add(rp.id);
      } else if (overriddenIsMarker) {
        const myGroupId = myParticipant?.roundGroupId;
        for (const rp of round.participants) {
          if (myGroupId ? rp.roundGroupId === myGroupId : true) {
            overriddenEditableIds.add(rp.id);
          }
        }
      } else if (myParticipant) {
        overriddenEditableIds.add(myParticipant.id);
      }
    }

    const overriddenGetRecordingRole = (
      roundParticipantId: string,
    ): 'player' | 'marker' | 'commissioner' => {
      const rp = round.participants.find((p) => p.id === roundParticipantId);
      if (rp?.person.userId === userId) return 'player';
      if (overriddenIsCommissioner) return 'commissioner';
      return 'marker';
    };

    return {
      isCommissioner: overriddenIsCommissioner,
      myParticipant,
      myRole,
      isRoundMarker: overriddenIsMarker,
      getRecordingRole: overriddenGetRecordingRole,
      editableParticipantIds: overriddenEditableIds,
      isMarkerOrCommissioner: overriddenIsCommissioner || overriddenIsMarker,
    };
  }

  return {
    isCommissioner,
    myParticipant,
    myRole,
    isRoundMarker,
    getRecordingRole,
    editableParticipantIds,
    isMarkerOrCommissioner,
  };
}
