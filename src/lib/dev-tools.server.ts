import { createServerFn } from '@tanstack/react-start';
import { eq, and, like } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  courses,
  courseHoles,
  persons,
  profiles,
  tournaments,
  tournamentParticipants,
  tournamentTeams,
  tournamentTeamMembers,
  rounds,
  roundGroups,
  roundParticipants,
  competitions,
} from '@/db/schema';
import { requireAuth } from './server/auth.helpers.server';
import { generateInviteCode } from './server/invite-codes.server';
import { TEST_ACCOUNTS } from './dev/test-accounts';
import { TEST_COURSES } from './dev/test-courses';
import type { SetupScenarioResult } from './dev/types';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const DEV_TOURNAMENT_PREFIX = 'DEV \u2014 ';

function assertDevMode() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev tools are not available in production');
  }
}

/**
 * Ensure a test course exists in the DB, creating it with holes if missing.
 * Returns the course ID.
 */
async function ensureTestCourse(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  courseIndex: 0 | 1,
  createdByUserId: string,
): Promise<string> {
  const testCourse = TEST_COURSES[courseIndex];

  const existing = await tx.query.courses.findFirst({
    where: eq(courses.name, testCourse.name),
    columns: { id: true },
  });
  if (existing) return existing.id;

  const [created] = await tx
    .insert(courses)
    .values({
      name: testCourse.name,
      location: testCourse.location,
      numberOfHoles: 18,
      createdByUserId,
    })
    .returning();

  await tx.insert(courseHoles).values(
    testCourse.holes.map((h) => ({
      courseId: created.id,
      holeNumber: h.holeNumber,
      par: h.par,
      strokeIndex: h.strokeIndex,
      yardage: h.yardage,
    })),
  );

  return created.id;
}

/**
 * Look up a test user's person record by their email.
 * Creates the person record if it doesn't exist yet.
 */
async function resolveTestUserPerson(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  email: string,
): Promise<{ personId: string; userId: string }> {
  const profile = await tx.query.profiles.findFirst({
    where: eq(profiles.email, email),
    columns: { id: true },
  });
  if (!profile) {
    throw new Error(
      `Test account ${email} not found. Create it in the Supabase dashboard first.`,
    );
  }

  const existing = await tx.query.persons.findFirst({
    where: eq(persons.userId, profile.id),
    columns: { id: true },
  });
  if (existing) return { personId: existing.id, userId: profile.id };

  const displayName =
    email === TEST_ACCOUNTS.A.email
      ? TEST_ACCOUNTS.A.displayName
      : TEST_ACCOUNTS.B.displayName;

  const [person] = await tx
    .insert(persons)
    .values({
      displayName,
      userId: profile.id,
      createdByUserId: profile.id,
    })
    .returning();

  return { personId: person.id, userId: profile.id };
}

// ──────────────────────────────────────────────
// Setup a scenario from a preset config
// ──────────────────────────────────────────────

const scenarioPresetSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  phase: z.number(),
  players: z.array(
    z.object({
      slot: z.enum(['test_a', 'test_b', 'guest']),
      guestName: z.string().optional(),
      handicap: z.number(),
    }),
  ),
  teams: z
    .array(
      z.object({
        name: z.string(),
        memberIndices: z.array(z.number()),
      }),
    )
    .optional(),
  rounds: z.array(
    z.object({
      courseIndex: z.union([z.literal(0), z.literal(1)]),
      groups: z.array(
        z.object({
          playerIndices: z.array(z.number()),
        }),
      ),
      competitions: z.array(
        z.object({
          name: z.string(),
          competitionCategory: z.enum(['match', 'game', 'bonus']),
          groupScope: z.enum(['all', 'within_group']),
          formatType: z.string(),
          config: z.record(z.string(), z.unknown()),
          requiresPairingResolution: z.boolean().optional(),
        }),
      ),
    }),
  ),
});

export const setupScenarioFn = createServerFn({ method: 'POST' })
  .inputValidator(scenarioPresetSchema)
  .handler(async ({ data: preset }) => {
    assertDevMode();
    const user = await requireAuth();

    const result = await db.transaction(async (tx) => {
      // 1. Determine which course indices are needed
      const courseIndices = [
        ...new Set(preset.rounds.map((r) => r.courseIndex)),
      ] as (0 | 1)[];
      const courseIds: Record<number, string> = {};
      for (const idx of courseIndices) {
        courseIds[idx] = await ensureTestCourse(tx, idx, user.id);
      }

      // 2. Resolve test user persons
      const testUserA = await resolveTestUserPerson(tx, TEST_ACCOUNTS.A.email);
      const testUserB = await resolveTestUserPerson(tx, TEST_ACCOUNTS.B.email);

      // 3. Create tournament
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const inviteCode = generateInviteCode();
      const [tournament] = await tx
        .insert(tournaments)
        .values({
          name: `${DEV_TOURNAMENT_PREFIX}${preset.label} \u2014 ${timestamp}`,
          isSingleRound: preset.rounds.length === 1,
          createdByUserId: user.id,
          inviteCode,
        })
        .returning();

      // 4. Add the current user as commissioner
      const currentUserPerson = await tx.query.persons.findFirst({
        where: eq(persons.userId, user.id),
        columns: { id: true },
      });
      if (!currentUserPerson) {
        throw new Error('Current user has no person record');
      }

      await tx
        .insert(tournamentParticipants)
        .values({
          tournamentId: tournament.id,
          personId: currentUserPerson.id,
          role: 'commissioner',
        })
        .returning();

      // 5. Create all player person records and tournament participants
      // Track: playerIndex -> { personId, tournamentParticipantId }
      const playerRecords: Array<{
        personId: string;
        tournamentParticipantId: string;
        handicap: number;
      }> = [];

      // Track which test users are already added (the current user might be one)
      const addedPersonIds = new Set<string>();
      addedPersonIds.add(currentUserPerson.id);

      for (const player of preset.players) {
        let personId: string;

        if (player.slot === 'test_a') {
          personId = testUserA.personId;
        } else if (player.slot === 'test_b') {
          personId = testUserB.personId;
        } else {
          // Create guest person
          const guestName =
            player.guestName ?? `Guest ${playerRecords.length + 1}`;
          const [guest] = await tx
            .insert(persons)
            .values({
              displayName: guestName,
              currentHandicap: player.handicap.toString(),
              createdByUserId: user.id,
            })
            .returning();
          personId = guest.id;
        }

        // Add as tournament participant if not already added
        if (addedPersonIds.has(personId)) {
          // Already added (e.g. current user is test_a or test_b)
          // Update their handicap override
          const existingTp = await tx.query.tournamentParticipants.findFirst({
            where: and(
              eq(tournamentParticipants.tournamentId, tournament.id),
              eq(tournamentParticipants.personId, personId),
            ),
          });
          if (existingTp) {
            await tx
              .update(tournamentParticipants)
              .set({ handicapOverride: player.handicap.toString() })
              .where(eq(tournamentParticipants.id, existingTp.id));
            playerRecords.push({
              personId,
              tournamentParticipantId: existingTp.id,
              handicap: player.handicap,
            });
            continue;
          }
        }

        const role =
          personId === currentUserPerson.id ? 'commissioner' : 'player';
        const [tp] = await tx
          .insert(tournamentParticipants)
          .values({
            tournamentId: tournament.id,
            personId,
            role,
            handicapOverride: player.handicap.toString(),
          })
          .returning();

        addedPersonIds.add(personId);
        playerRecords.push({
          personId,
          tournamentParticipantId: tp.id,
          handicap: player.handicap,
        });
      }

      // 6. Create teams (if any)
      const teamRecords: Array<{ teamId: string; name: string }> = [];
      if (preset.teams) {
        for (const teamSetup of preset.teams) {
          const [team] = await tx
            .insert(tournamentTeams)
            .values({
              tournamentId: tournament.id,
              name: teamSetup.name,
            })
            .returning();

          for (const memberIdx of teamSetup.memberIndices) {
            const player = playerRecords[memberIdx];
            if (!player) continue;
            await tx.insert(tournamentTeamMembers).values({
              teamId: team.id,
              participantId: player.tournamentParticipantId,
            });
          }

          teamRecords.push({ teamId: team.id, name: teamSetup.name });
        }
      }

      // 7. Create rounds with groups, participants, and competitions
      const roundIds: string[] = [];

      for (let roundIdx = 0; roundIdx < preset.rounds.length; roundIdx++) {
        const roundSetup = preset.rounds[roundIdx];
        const courseId = courseIds[roundSetup.courseIndex];

        const [round] = await tx
          .insert(rounds)
          .values({
            tournamentId: tournament.id,
            courseId,
            roundNumber: roundIdx + 1,
            createdByUserId: user.id,
          })
          .returning();
        roundIds.push(round.id);

        // Add all players as round participants
        const roundParticipantRecords: Array<{
          roundParticipantId: string;
          playerIndex: number;
        }> = [];

        for (let pIdx = 0; pIdx < playerRecords.length; pIdx++) {
          const player = playerRecords[pIdx];
          const [rp] = await tx
            .insert(roundParticipants)
            .values({
              roundId: round.id,
              personId: player.personId,
              tournamentParticipantId: player.tournamentParticipantId,
              handicapSnapshot: player.handicap.toString(),
            })
            .returning();
          roundParticipantRecords.push({
            roundParticipantId: rp.id,
            playerIndex: pIdx,
          });
        }

        // Create groups and assign participants
        const groupRecords: Array<{ groupId: string; groupIndex: number }> = [];
        for (let gIdx = 0; gIdx < roundSetup.groups.length; gIdx++) {
          const groupSetup = roundSetup.groups[gIdx];
          const [group] = await tx
            .insert(roundGroups)
            .values({
              roundId: round.id,
              groupNumber: gIdx + 1,
              name: `Group ${gIdx + 1}`,
            })
            .returning();
          groupRecords.push({ groupId: group.id, groupIndex: gIdx });

          // Assign players to this group
          for (const playerIdx of groupSetup.playerIndices) {
            const rpRecord = roundParticipantRecords.find(
              (r) => r.playerIndex === playerIdx,
            );
            if (!rpRecord) continue;
            await tx
              .update(roundParticipants)
              .set({ roundGroupId: group.id })
              .where(eq(roundParticipants.id, rpRecord.roundParticipantId));
          }
        }

        // Create competitions
        for (const compSetup of roundSetup.competitions) {
          let configJson: Record<string, JsonValue> = {
            ...compSetup.config,
          } as Record<string, JsonValue>;

          // Resolve pairings if needed
          if (compSetup.requiresPairingResolution) {
            if (
              compSetup.formatType === 'match_play' &&
              'pairings' in configJson
            ) {
              // Match play pairings use player indices — resolve to round participant IDs
              const rawPairings = configJson.pairings as Array<{
                playerA: number;
                playerB: number;
              }>;
              configJson.pairings = rawPairings.map((p) => ({
                playerA:
                  roundParticipantRecords.find(
                    (r) => r.playerIndex === p.playerA,
                  )?.roundParticipantId ?? '',
                playerB:
                  roundParticipantRecords.find(
                    (r) => r.playerIndex === p.playerB,
                  )?.roundParticipantId ?? '',
              }));
            } else if (
              (compSetup.formatType === 'best_ball' ||
                compSetup.formatType === 'hi_lo') &&
              'pairings' in configJson
            ) {
              // Best ball / hi-lo pairings use team indices — resolve to team IDs
              const rawPairings = configJson.pairings as Array<{
                teamA: number;
                teamB: number;
              }>;
              configJson.pairings = rawPairings.map((p) => ({
                teamA: teamRecords[p.teamA]?.teamId ?? '',
                teamB: teamRecords[p.teamB]?.teamId ?? '',
              }));
            }
          }

          await tx.insert(competitions).values({
            tournamentId: tournament.id,
            roundId: round.id,
            name: compSetup.name,
            competitionCategory: compSetup.competitionCategory,
            groupScope: compSetup.groupScope,
            formatType: compSetup.formatType,
            configJson,
          });
        }
      }

      // 8. Lock tournament: setup -> scheduled, all rounds -> scheduled
      await tx
        .update(tournaments)
        .set({ status: 'scheduled', updatedAt: new Date() })
        .where(eq(tournaments.id, tournament.id));

      for (const roundId of roundIds) {
        await tx
          .update(rounds)
          .set({ status: 'scheduled', updatedAt: new Date() })
          .where(eq(rounds.id, roundId));
      }

      // 9. Open round 1: scheduled -> open, tournament -> underway
      await tx
        .update(rounds)
        .set({ status: 'open', updatedAt: new Date() })
        .where(eq(rounds.id, roundIds[0]));

      await tx
        .update(tournaments)
        .set({ status: 'underway', updatedAt: new Date() })
        .where(eq(tournaments.id, tournament.id));

      return {
        tournamentId: tournament.id,
        roundIds,
        inviteCode: tournament.inviteCode,
      } satisfies SetupScenarioResult;
    });

    return result;
  });

// ──────────────────────────────────────────────
// Teardown a single test tournament
// ──────────────────────────────────────────────

export const teardownScenarioFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    assertDevMode();
    await requireAuth();

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
      columns: { id: true, name: true },
    });
    if (!tournament) throw new Error('Tournament not found');
    if (!tournament.name.startsWith(DEV_TOURNAMENT_PREFIX)) {
      throw new Error('Can only tear down DEV tournaments');
    }

    // Collect guest person IDs before deletion
    const tps = await db.query.tournamentParticipants.findMany({
      where: eq(tournamentParticipants.tournamentId, data.tournamentId),
      with: {
        person: { columns: { id: true, userId: true } },
      },
    });
    const guestPersonIds = tps
      .filter((tp) => tp.person.userId === null)
      .map((tp) => tp.person.id);

    // Delete tournament (CASCADE handles everything)
    await db.delete(tournaments).where(eq(tournaments.id, data.tournamentId));

    // Soft-delete guest persons created for this scenario
    for (const personId of guestPersonIds) {
      await db
        .update(persons)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(persons.id, personId));
    }

    return { success: true };
  });

// ──────────────────────────────────────────────
// Teardown all test data (all DEV tournaments)
// ──────────────────────────────────────────────

export const teardownAllTestDataFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    assertDevMode();
    await requireAuth();

    // Find all DEV tournaments
    const devTournaments = await db.query.tournaments.findMany({
      where: like(tournaments.name, `${DEV_TOURNAMENT_PREFIX}%`),
      columns: { id: true },
    });

    if (devTournaments.length === 0) {
      return { deleted: 0 };
    }

    // Collect all guest person IDs from these tournaments
    const allGuestPersonIds: string[] = [];
    for (const t of devTournaments) {
      const tps = await db.query.tournamentParticipants.findMany({
        where: eq(tournamentParticipants.tournamentId, t.id),
        with: {
          person: { columns: { id: true, userId: true } },
        },
      });
      for (const tp of tps) {
        if (tp.person.userId === null) {
          allGuestPersonIds.push(tp.person.id);
        }
      }
    }

    // Delete all DEV tournaments
    for (const t of devTournaments) {
      await db.delete(tournaments).where(eq(tournaments.id, t.id));
    }

    // Soft-delete guest persons
    const uniqueGuestIds = [...new Set(allGuestPersonIds)];
    for (const personId of uniqueGuestIds) {
      await db
        .update(persons)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(persons.id, personId));
    }

    return { deleted: devTournaments.length };
  },
);
