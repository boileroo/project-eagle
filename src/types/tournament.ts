import type {
  getTournamentFn,
  getTournamentsFn,
} from '@/lib/tournaments.server';

export type TournamentLoaderData = Awaited<ReturnType<typeof getTournamentFn>>;

export type TournamentSummary = Awaited<
  ReturnType<typeof getTournamentsFn>
>[number];

export type TournamentFormData = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string | null;
};

export type MyPerson = { id: string } | null;

export type Course = {
  id: string;
  name: string;
  location: string | null;
  numberOfHoles: number;
};

export type RoundItem = {
  id: string;
  roundNumber: number | null;
  date: string | Date | null;
  teeTime: string | null;
  status: string;
  course: { id: string; name: string } | null;
};

export type TeamsSectionTournament = {
  id: string;
  participants: {
    id: string;
    personId: string;
    role: string;
    person: { id: string; displayName: string; userId: string | null };
  }[];
  teams: {
    id: string;
    name: string;
    members: {
      id: string;
      participantId: string;
      participant: {
        id: string;
        person: { id: string; displayName: string };
      };
    }[];
  }[];
};
