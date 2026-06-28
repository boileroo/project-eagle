import { createServerFn } from '@tanstack/react-start';
import { and, eq, count, asc, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  games,
  courses,
  rounds,
  groups,
  roundPlayers,
  players,
  tournaments,
  persons,
} from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { resolveOrCreatePersonForUser } from './server/persons.server';
import {
  createRoundSchema,
  createSingleRoundSchema,
  updateRoundSchema,
  handicapField,
} from './validators';
import { deriveTournamentStatus } from './tournament-status';
import { safeHandler } from './server/server-utils.server';
import { generateInviteCode } from './server/invite-codes.server';
import { isValidHandicap, parseHandicap } from './handicaps';

async function resortRoundsByDate(tournamentId: string) {
  const allRounds = await db.query.rounds.findMany({
    where: eq(rounds.tournamentId, tournamentId),
    orderBy: [asc(rounds.roundNumber)],
  });

  const datedRounds = allRounds.filter((r) => r.date != null);
  if (datedRounds.length < 2) return;

  const sortedDated = [...datedRounds].sort((a, b) => {
    const aTime = new Date(a.date!).getTime();
    const bTime = new Date(b.date!).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return (a.teeTime ?? '').localeCompare(b.teeTime ?? '');
  });

  const sorted = [...allRounds];
  let datedIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].date != null) {
      sorted[i] = sortedDated[datedIdx++];
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].roundNumber !== i + 1) {
      await db
        .update(rounds)
        .set({ roundNumber: i + 1 })
        .where(eq(rounds.id, sorted[i].id));
    }
  }
}

async function syncTournamentStatus(tournamentId: string) {
  const allRounds = await db.query.rounds.findMany({
    where: eq(rounds.tournamentId, tournamentId),
    columns: { status: true },
  });

  const newStatus = deriveTournamentStatus(allRounds.map((r) => r.status));

  await db
    .update(tournaments)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));
}

export const getActiveRoundsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
      columns: { id: true },
    });
    if (!person) return [];

    const activeRPs = await db.query.roundPlayers.findMany({
      where: eq(roundPlayers.personId, person.id),
      with: {
        round: {
          with: {
            course: { columns: { id: true, name: true } },
            tournament: {
              columns: { id: true, name: true, isSingleRound: true },
            },
            players: { columns: { id: true } },
          },
        },
      },
    });

    return activeRPs
      .filter((rp) => rp.round.status === 'open')
      .map((rp) => ({
        roundId: rp.round.id,
        roundNumber: rp.round.roundNumber,
        tournamentId: rp.round.tournament.id,
        tournamentName: rp.round.tournament.name,
        isSingleRound: rp.round.tournament.isSingleRound,
        courseName: rp.round.course.name,
        playerCount: rp.round.players.length,
        date: rp.round.date,
        teeTime: rp.round.teeTime,
      }));
  },
);

export const getSingleRoundsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();
    const singleTournaments = await db.query.tournaments.findMany({
      where: and(
        eq(tournaments.isSingleRound, true),
        eq(tournaments.createdByUserId, user.id),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      with: {
        rounds: {
          with: {
            course: true,
            players: {
              with: { person: true },
            },
          },
        },
      },
    });

    return singleTournaments.map((t) => t.rounds[0]).filter(Boolean);
  },
);

export const getRoundFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      with: {
        course: {
          with: {
            holes: {
              orderBy: (holes, { asc }) => [asc(holes.holeNumber)],
            },
          },
        },
        tournament: {
          with: {
            teams: true,
          },
        },
        groups: {
          orderBy: (g, { asc }) => [asc(g.groupNumber)],
          with: {
            players: {
              with: { person: true },
            },
          },
        },
        players: {
          with: {
            person: true,
            player: {
              with: {
                teamMemberships: {
                  with: { team: true },
                },
              },
            },
          },
          orderBy: (rp, { asc }) => [asc(rp.createdAt)],
        },
      },
    });
    if (!round) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, round.tournamentId);
    return round;
  });

export const createRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(createRoundSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireCommissioner(data.tournamentId);

      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, data.tournamentId),
        columns: { status: true },
      });
      if (!tournament) throw new Error('Tournament not found');
      if (tournament.status !== 'setup') {
        throw new Error('Can only add rounds while the tournament is in setup');
      }

      const result = await db.transaction(async (tx) => {
        const [{ value: existingCount }] = await tx
          .select({ value: count() })
          .from(rounds)
          .where(eq(rounds.tournamentId, data.tournamentId));

        const [round] = await tx
          .insert(rounds)
          .values({
            tournamentId: data.tournamentId,
            courseId: data.courseId,
            roundNumber: existingCount + 1,
            date: data.date ? new Date(data.date) : null,
            teeTime: data.teeTime || null,
            label: data.label || null,
            createdByUserId: user.id,
          })
          .returning();

        const playerList = await tx.query.players.findMany({
          where: eq(players.tournamentId, data.tournamentId),
          with: { person: true },
        });

        if (playerList.length > 0) {
          await tx.insert(roundPlayers).values(
            playerList.map((p) => ({
              roundId: round.id,
              personId: p.personId,
              playerId: p.id,
              handicapSnapshot:
                p.handicapOverride ?? p.person.currentHandicap ?? '0',
            })),
          );
        }

        if (playerList.length >= 1) {
          const numGroups = Math.ceil(playerList.length / 4);
          const createdGroups: (typeof groups.$inferSelect)[] = [];

          for (let i = 0; i < numGroups; i++) {
            const [group] = await tx
              .insert(groups)
              .values({
                roundId: round.id,
                groupNumber: i + 1,
                name: `Group ${i + 1}`,
              })
              .returning();
            createdGroups.push(group);
          }

          for (let i = 0; i < playerList.length; i++) {
            const groupIdx = i % numGroups;
            await tx
              .update(roundPlayers)
              .set({ groupId: createdGroups[groupIdx].id })
              .where(
                and(
                  eq(roundPlayers.roundId, round.id),
                  eq(roundPlayers.personId, playerList[i].personId),
                ),
              );
          }
        }

        return { roundId: round.id };
      });

      await resortRoundsByDate(data.tournamentId);

      return result;
    }),
  );

export const updateRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(updateRoundSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.id),
    });
    if (!existing) throw new Error('Round not found');
    if (existing.status !== 'draft') {
      throw new Error('Can only edit rounds in draft status');
    }

    await requireCommissioner(existing.tournamentId);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.courseId !== undefined) updates.courseId = data.courseId;
    if (data.date !== undefined)
      updates.date = data.date ? new Date(data.date) : null;
    if (data.teeTime !== undefined) updates.teeTime = data.teeTime || null;
    if (data.label !== undefined) updates.label = data.label || null;

    await db.update(rounds).set(updates).where(eq(rounds.id, data.id));

    if (data.date !== undefined || data.teeTime !== undefined) {
      await resortRoundsByDate(existing.tournamentId);
    }

    return { roundId: data.id };
  });

export const deleteRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!existing) throw new Error('Round not found');
    if (existing.status !== 'draft') {
      throw new Error('Can only delete rounds in draft status');
    }

    await requireCommissioner(existing.tournamentId);

    await db.delete(rounds).where(eq(rounds.id, data.roundId));

    return { success: true };
  });

export const reorderRoundsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      tournamentId: z.string().uuid(),
      roundIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const allRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, data.tournamentId),
    });
    const roundMap = new Map(allRounds.map((r) => [r.id, r]));

    let lastDatedTime = -Infinity;
    for (const id of data.roundIds) {
      const r = roundMap.get(id);
      if (!r || !r.date) continue;
      const t = new Date(r.date).getTime();
      const teeMinutes = r.teeTime
        ? Number(r.teeTime.split(':')[0]) * 60 + Number(r.teeTime.split(':')[1])
        : 0;
      const fullTime = t + teeMinutes * 60000;
      if (fullTime < lastDatedTime) {
        throw new Error('Dated rounds must remain in chronological order');
      }
      lastDatedTime = fullTime;
    }

    for (let i = 0; i < data.roundIds.length; i++) {
      await db
        .update(rounds)
        .set({ roundNumber: i + 1 })
        .where(eq(rounds.id, data.roundIds[i]));
    }

    return { success: true };
  });

const validTransitions: Record<string, string[]> = {
  draft: ['scheduled'],
  scheduled: ['open', 'draft'],
  open: ['finalized', 'scheduled'],
  finalized: ['open'],
};

export const transitionRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      newStatus: z.enum(['draft', 'scheduled', 'open', 'finalized']),
    }),
  )
  .handler(async ({ data }) => {
    const existing = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
    });
    if (!existing) throw new Error('Round not found');

    await requireCommissioner(existing.tournamentId);

    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(data.newStatus)) {
      throw new Error(
        `Cannot transition from "${existing.status}" to "${data.newStatus}"`,
      );
    }

    if (existing.roundNumber) {
      const earlierRounds = await db.query.rounds.findMany({
        where: and(
          eq(rounds.tournamentId, existing.tournamentId),
          lt(rounds.roundNumber, existing.roundNumber),
        ),
      });

      if (data.newStatus === 'open') {
        const openEarlier = earlierRounds.find((r) => r.status === 'open');
        if (openEarlier) {
          throw new Error(
            `Cannot open this round while Round ${openEarlier.roundNumber} is still open`,
          );
        }
      }

      if (data.newStatus === 'scheduled') {
        const draftEarlier = earlierRounds.find((r) => r.status === 'draft');
        if (draftEarlier) {
          throw new Error(
            `Cannot schedule this round while Round ${draftEarlier.roundNumber} is still in draft`,
          );
        }
      }

      if (data.newStatus === 'finalized') {
        const unfinalized = earlierRounds.find((r) => r.status !== 'finalized');
        if (unfinalized) {
          throw new Error(
            `Cannot finalize this round while Round ${unfinalized.roundNumber} is not finalized`,
          );
        }
      }
    }

    if (data.newStatus === 'open') {
      const roundGames = await db.query.games.findMany({
        where: eq(games.roundId, data.roundId),
      });

      for (const game of roundGames) {
        if (!game.groupId) continue;

        const group = await db.query.groups.findFirst({
          where: eq(groups.id, game.groupId),
          with: { players: true },
        });
        if (!group) continue;

        const size = group.players.length;
        const groupLabel = group.name ?? `Group ${group.groupNumber}`;

        if (game.format === 'wolf' && size !== 4) {
          throw new Error(
            `Cannot open round: "${game.name}" (Wolf) requires exactly 4 players per group, but ${groupLabel} has ${size}.`,
          );
        }
        if (game.format === 'six_point' && size !== 3) {
          throw new Error(
            `Cannot open round: "${game.name}" (Six Point) requires exactly 3 players per group, but ${groupLabel} has ${size}.`,
          );
        }
        if (
          (game.format === 'best_ball' ||
            game.format === 'hi_lo' ||
            game.format === 'rumble') &&
          size !== 4
        ) {
          throw new Error(
            `Cannot open round: "${game.name}" requires exactly 4 players per group, but ${groupLabel} has ${size}.`,
          );
        }
        if (game.format === 'chair' && size < 2) {
          throw new Error(
            `Cannot open round: "${game.name}" (Chair) requires at least 2 players per group, but ${groupLabel} has ${size}.`,
          );
        }
      }

      const teamBasedGames = roundGames.filter((g) =>
        ['best_ball', 'hi_lo', 'rumble'].includes(g.format),
      );

      for (const game of teamBasedGames) {
        if (!game.groupId) continue;

        const group = await db.query.groups.findFirst({
          where: eq(groups.id, game.groupId),
          with: { players: true },
        });
        if (!group) continue;

        const groupLabel = group.name ?? `Group ${group.groupNumber}`;
        const playerIds = group.players
          .map((rp) => rp.playerId)
          .filter((id): id is string => id != null);

        const memberships =
          playerIds.length > 0
            ? await db.query.teamMembers.findMany({
                where: (tm, { inArray }) => inArray(tm.playerId, playerIds),
              })
            : [];

        const teamByPlayerId = new Map<string, string>();
        for (const m of memberships) {
          teamByPlayerId.set(m.playerId, m.teamId);
        }

        for (const rp of group.players) {
          if (!rp.playerId || !teamByPlayerId.has(rp.playerId)) {
            throw new Error(
              `Cannot open round: "${game.name}" requires all players to be assigned to a team. A player in ${groupLabel} has no team assignment.`,
            );
          }
        }

        if (game.format === 'best_ball' || game.format === 'hi_lo') {
          const teamIds = new Set(
            group.players
              .map((rp) =>
                rp.playerId ? teamByPlayerId.get(rp.playerId) : undefined,
              )
              .filter((id): id is string => id != null),
          );
          if (teamIds.size !== 2) {
            throw new Error(
              `Cannot open round: "${game.name}" requires exactly 2 teams per group, but ${groupLabel} has players from ${teamIds.size} team(s).`,
            );
          }
        }
      }
    }

    await db
      .update(rounds)
      .set({
        status: data.newStatus as 'draft' | 'scheduled' | 'open' | 'finalized',
        updatedAt: new Date(),
      })
      .where(eq(rounds.id, data.roundId));

    await syncTournamentStatus(existing.tournamentId);

    return { success: true };
  });

export const addRoundPlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      personId: z.string().uuid(),
      playerId: z.string().uuid().optional(),
      handicapSnapshot: z.string().refine((value) => {
        const parsed = parseHandicap(value);
        return parsed != null && isValidHandicap(parsed);
      }, 'Invalid handicap snapshot'),
    }),
  )
  .handler(
    safeHandler(async ({ data }) => {
      const round = await db.query.rounds.findFirst({
        where: eq(rounds.id, data.roundId),
      });
      if (!round) throw new Error('Round not found');
      if (round.status !== 'draft') {
        throw new Error('Can only add players to draft rounds');
      }

      await requireCommissioner(round.tournamentId);

      const existing = await db.query.roundPlayers.findFirst({
        where: and(
          eq(roundPlayers.roundId, data.roundId),
          eq(roundPlayers.personId, data.personId),
        ),
      });
      if (existing) throw new Error('Person is already in this round');

      const [rp] = await db
        .insert(roundPlayers)
        .values({
          roundId: data.roundId,
          personId: data.personId,
          playerId: data.playerId ?? null,
          handicapSnapshot: data.handicapSnapshot,
        })
        .returning();

      const roundGroupList = await db.query.groups.findMany({
        where: eq(groups.roundId, data.roundId),
      });
      if (roundGroupList.length === 1) {
        await db
          .update(roundPlayers)
          .set({ groupId: roundGroupList[0].id })
          .where(eq(roundPlayers.id, rp.id));
      }

      return { roundPlayerId: rp.id };
    }),
  );

export const removeRoundPlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ roundPlayerId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const rp = await db.query.roundPlayers.findFirst({
      where: eq(roundPlayers.id, data.roundPlayerId),
      with: { round: true },
    });
    if (!rp) throw new Error('Round player not found');
    if (rp.round.status !== 'draft') {
      throw new Error('Can only remove players from draft rounds');
    }

    await requireCommissioner(rp.round.tournamentId);

    await db
      .delete(roundPlayers)
      .where(eq(roundPlayers.id, data.roundPlayerId));

    return { success: true };
  });

export const updateRoundPlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundPlayerId: z.string().uuid(),
      handicapOverride: handicapField,
    }),
  )
  .handler(async ({ data }) => {
    const rp = await db.query.roundPlayers.findFirst({
      where: eq(roundPlayers.id, data.roundPlayerId),
      with: { round: true },
    });
    if (!rp) throw new Error('Round player not found');
    if (rp.round.status === 'finalized') {
      throw new Error('Cannot edit handicaps on finalized rounds');
    }

    await requireCommissioner(rp.round.tournamentId);

    await db
      .update(roundPlayers)
      .set({
        handicapOverride: data.handicapOverride?.toString() ?? null,
      })
      .where(eq(roundPlayers.id, data.roundPlayerId));

    return { success: true };
  });

export const toggleRoundMarkerFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundPlayerId: z.string().uuid(),
      isMarker: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const rp = await db.query.roundPlayers.findFirst({
      where: eq(roundPlayers.id, data.roundPlayerId),
      with: { round: true },
    });
    if (!rp) throw new Error('Round player not found');

    await requireCommissioner(rp.round.tournamentId);

    await db
      .update(roundPlayers)
      .set({ isMarker: data.isMarker })
      .where(eq(roundPlayers.id, data.roundPlayerId));

    return { success: true };
  });

export const createSingleRoundFn = createServerFn({ method: 'POST' })
  .inputValidator(createSingleRoundSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const person = await resolveOrCreatePersonForUser(user.id);

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
    });
    const courseName = course?.name ?? 'Round';
    const dateLabel = data.date
      ? new Date(data.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
    const tournamentName = `${courseName} – ${dateLabel}`;

    const [tournament] = await db
      .insert(tournaments)
      .values({
        name: tournamentName,
        isSingleRound: true,
        createdByUserId: user.id,
        inviteCode: generateInviteCode(),
      })
      .returning();

    const [player] = await db
      .insert(players)
      .values({
        tournamentId: tournament.id,
        personId: person.id,
        role: 'commissioner',
      })
      .returning();

    const [round] = await db
      .insert(rounds)
      .values({
        tournamentId: tournament.id,
        courseId: data.courseId,
        roundNumber: 1,
        date: data.date ? new Date(data.date) : new Date(),
        teeTime: data.teeTime || null,
        createdByUserId: user.id,
      })
      .returning();

    const [roundPlayer] = await db
      .insert(roundPlayers)
      .values({
        roundId: round.id,
        personId: person.id,
        playerId: player.id,
        handicapSnapshot: person.currentHandicap ?? '0',
      })
      .returning();

    const [defaultGroup] = await db
      .insert(groups)
      .values({ roundId: round.id, groupNumber: 1, name: 'Group 1' })
      .returning();

    await db
      .update(roundPlayers)
      .set({ groupId: defaultGroup.id })
      .where(eq(roundPlayers.id, roundPlayer.id));

    return {
      tournamentId: tournament.id,
      roundId: round.id,
    };
  });
