import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PersonWithUserId {
  person: {
    userId: string | null;
  };
}

export function findMyParticipant<T extends PersonWithUserId>(
  participants: T[],
  userId: string,
): T | undefined {
  return participants.find((rp) => rp.person.userId === userId);
}
