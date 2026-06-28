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
  players,
  teams,
  teamMembers,
  rounds,
  groups,
  roundPlayers,
  games,
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
          formatType: z.string(),
          config: z.record(z.string(), z.unknown()),
          groupIndex: z.number().int().nonnegative().optional(),
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
      const courseIndices = [
        ...new Set(preset.rounds.map((r) => r.courseIndex)),
      ] as (0 | 1)[];
      const courseIds: Record<number, string> = {};
      for (const idx of courseIndices) {
        courseIds[idx] = await ensureTestCourse(tx, idx, user.id);
      }

      const testUserA = await resolveTestUserPerson(tx, TEST_ACCOUNTS.A.email);
      const testUserB = await resolveTestUserPerson(tx, TEST_ACCOUNTS.B.email);

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

      const currentUserPerson = await tx.query.persons.findFirst({
        where: eq(persons.userId, user.id),
        columns: { id: true },
      });
      if (!currentUserPerson) {
        throw new Error('Current user has no person record');
      }

      await tx
        .insert(players)
        .values({
          tournamentId: tournament.id,
          personId: currentUserPerson.id,
          role: 'commissioner',
        })
        .returning();

      const playerRecords: Array<{
        personId: string;
        playerId: string;
        handicap: number;
      }> = [];

      const addedPersonIds = new Set<string>();
      addedPersonIds.add(currentUserPerson.id);

      for (const player of preset.players) {
        let personId: string;

        if (player.slot === 'test_a') {
          personId = testUserA.personId;
        } else if (player.slot === 'test_b') {
          personId = testUserB.personId;
        } else {
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

        if (addedPersonIds.has(personId)) {
          const existingPlayer = await tx.query.players.findFirst({
            where: and(
              eq(players.tournamentId, tournament.id),
              eq(players.personId, personId),
            ),
          });
          if (existingPlayer) {
            await tx
              .update(players)
              .set({ handicapOverride: player.handicap.toString() })
              .where(eq(players.id, existingPlayer.id));
            playerRecords.push({
              personId,
              playerId: existingPlayer.id,
              handicap: player.handicap,
            });
            continue;
          }
        }

        const role =
          personId === currentUserPerson.id ? 'commissioner' : 'player';
        const [tp] = await tx
          .insert(players)
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
          playerId: tp.id,
          handicap: player.handicap,
        });
      }

      const teamRecords: Array<{ teamId: string; name: string }> = [];
      if (preset.teams) {
        for (const teamSetup of preset.teams) {
          const [team] = await tx
            .insert(teams)
            .values({
              tournamentId: tournament.id,
              name: teamSetup.name,
            })
            .returning();

          for (const memberIdx of teamSetup.memberIndices) {
            const player = playerRecords[memberIdx];
            if (!player) continue;
            await tx.insert(teamMembers).values({
              teamId: team.id,
              playerId: player.playerId,
            });
          }

          teamRecords.push({ teamId: team.id, name: teamSetup.name });
        }
      }

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

        const roundPlayerRecords: Array<{
          roundPlayerId: string;
          playerIndex: number;
        }> = [];

        for (let pIdx = 0; pIdx < playerRecords.length; pIdx++) {
          const player = playerRecords[pIdx];
          const [rp] = await tx
            .insert(roundPlayers)
            .values({
              roundId: round.id,
              personId: player.personId,
              playerId: player.playerId,
              handicapSnapshot: player.handicap.toString(),
            })
            .returning();
          roundPlayerRecords.push({
            roundPlayerId: rp.id,
            playerIndex: pIdx,
          });
        }

        const groupRecords: Array<{ groupId: string; groupIndex: number }> = [];
        for (let gIdx = 0; gIdx < roundSetup.groups.length; gIdx++) {
          const groupSetup = roundSetup.groups[gIdx];
          const [group] = await tx
            .insert(groups)
            .values({
              roundId: round.id,
              groupNumber: gIdx + 1,
              name: `Group ${gIdx + 1}`,
            })
            .returning();
          groupRecords.push({ groupId: group.id, groupIndex: gIdx });

          for (const playerIdx of groupSetup.playerIndices) {
            const rpRecord = roundPlayerRecords.find(
              (r) => r.playerIndex === playerIdx,
            );
            if (!rpRecord) continue;
            await tx
              .update(roundPlayers)
              .set({ groupId: group.id })
              .where(eq(roundPlayers.id, rpRecord.roundPlayerId));
          }
        }

        for (const compSetup of roundSetup.competitions) {
          if (compSetup.competitionCategory === 'bonus') continue;

          const configJson: Record<string, JsonValue> = {
            ...compSetup.config,
          } as Record<string, JsonValue>;

          if (compSetup.requiresPairingResolution) {
            if (
              compSetup.formatType === 'match_play' &&
              'pairings' in configJson
            ) {
              const rawPairings = configJson.pairings as Array<{
                playerA: number;
                playerB: number;
              }>;
              configJson.pairings = rawPairings.map((p) => ({
                playerA:
                  roundPlayerRecords.find((r) => r.playerIndex === p.playerA)
                    ?.roundPlayerId ?? '',
                playerB:
                  roundPlayerRecords.find((r) => r.playerIndex === p.playerB)
                    ?.roundPlayerId ?? '',
              }));
            } else if (
              (compSetup.formatType === 'best_ball' ||
                compSetup.formatType === 'hi_lo') &&
              'pairings' in configJson
            ) {
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

          const resolvedGroupId =
            compSetup.groupIndex !== undefined
              ? (groupRecords.find((g) => g.groupIndex === compSetup.groupIndex)
                  ?.groupId ?? null)
              : null;

          await tx.insert(games).values({
            tournamentId: tournament.id,
            roundId: round.id,
            groupId: resolvedGroupId,
            name: compSetup.name,
            format: compSetup.formatType,
            config: configJson,
          });
        }
      }

      return {
        tournamentId: tournament.id,
        roundIds,
        inviteCode: tournament.inviteCode,
      } satisfies SetupScenarioResult;
    });

    return result;
  });

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

    const tps = await db.query.players.findMany({
      where: eq(players.tournamentId, data.tournamentId),
      with: {
        person: { columns: { id: true, userId: true } },
      },
    });
    const guestPersonIds = tps
      .filter((tp) => tp.person.userId === null)
      .map((tp) => tp.person.id);

    await db.delete(tournaments).where(eq(tournaments.id, data.tournamentId));

    for (const personId of guestPersonIds) {
      await db
        .update(persons)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(persons.id, personId));
    }

    return { success: true };
  });

export const teardownAllTestDataFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    assertDevMode();
    await requireAuth();

    const devTournaments = await db.query.tournaments.findMany({
      where: like(tournaments.name, `${DEV_TOURNAMENT_PREFIX}%`),
      columns: { id: true },
    });

    if (devTournaments.length === 0) {
      return { deleted: 0 };
    }

    const allGuestPersonIds: string[] = [];
    for (const t of devTournaments) {
      const tps = await db.query.players.findMany({
        where: eq(players.tournamentId, t.id),
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

    for (const t of devTournaments) {
      await db.delete(tournaments).where(eq(tournaments.id, t.id));
    }

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
