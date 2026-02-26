import type { getMyGuestsFn } from '@/lib/tournaments.server';

export type Guest = {
  id: string;
  name: string;
  handicap: number | null;
  email: string | null;
  phone: string | null;
};

export type GuestListItem = Awaited<ReturnType<typeof getMyGuestsFn>>[number];

export type PersonSearchResult = Guest & {
  type: 'guest';
};
