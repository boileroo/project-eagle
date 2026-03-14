import type { getMyGuestsFn } from '@/lib/tournaments.server';

export type Guest = {
  id: string;
  displayName: string;
  currentHandicap: string | null;
  createdAt: Date;
};

export type GuestListItem = Awaited<ReturnType<typeof getMyGuestsFn>>[number];

export type PersonSearchResult = Guest & {
  type: 'guest';
};
