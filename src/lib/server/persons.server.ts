import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { persons, profiles } from '@/db/schema';

/**
 * Resolves the authenticated user's canonical person row, creating it if needed.
 */
export async function resolveOrCreatePersonForUser(userId: string) {
  const existing = await db.query.persons.findFirst({
    where: eq(persons.userId, userId),
  });
  if (existing) return existing;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
  const displayName = profile?.displayName || profile?.email || 'Unknown';

  const [person] = await db
    .insert(persons)
    .values({
      displayName,
      userId,
      createdByUserId: userId,
    })
    .returning();

  return person;
}
