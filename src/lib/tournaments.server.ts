import { createServerFn } from '@tanstack/react-start';
import { and, eq, ilike, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  persons,
  groups,
  roundPlayers,
  rounds,
  players,
  tournaments,
} from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  requireTournamentParticipant,
} from './server/auth.helpers.server';
import { resolveOrCreatePersonForUser } from './server/persons.server';
import {
  addPlayerSchema,
  createGuestSchema,
  createTournamentSchema,
  joinByCodeSchema,
  updatePlayerSchema,
  updateGuestSchema,
  deleteGuestSchema,
  updateTournamentSchema,
} from './validators';
import { isTournamentInSetup } from './tournament-status';
import { safeHandler } from './server/server-utils.server';
import { generateInviteCode } from './server/invite-codes.server';
import { requireTournamentSetup } from './server/tournament-status.server';

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

export const getTournamentsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });

    const allTournaments = await db.query.tournaments.findMany({
      orderBy: (tournaments, { desc }) => [desc(tournaments.createdAt)],
      with: {
        players: true,
        rounds: {
          with: {
            course: { columns: { id: true, name: true } },
          },
          orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
        },
      },
    });

    const filteredTournaments = allTournaments.filter(
      (t) =>
        t.createdByUserId === user.id ||
        (person && t.players.some((p) => p.personId === person.id)),
    );

    return filteredTournaments;
  },
);

export const getTournamentFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
      columns: {
        id: true,
        name: true,
        description: true,
        status: true,
        isSingleRound: true,
        inviteCode: true,
        scoringBasis: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        players: {
          with: {
            person: true,
          },
        },
        teams: {
          with: {
            members: {
              with: {
                player: {
                  with: {
                    person: true,
                  },
                },
              },
            },
          },
        },
        rounds: {
          orderBy: (rounds, { asc }) => [asc(rounds.roundNumber)],
          with: {
            course: true,
          },
        },
      },
    });
    if (!tournament) throw new Error('Tournament not found');
    return tournament;
  });

export const createTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(createTournamentSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      const inviteCode = generateInviteCode();

      const [tournament] = await db
        .insert(tournaments)
        .values({
          name: data.name,
          description: data.description || null,
          createdByUserId: user.id,
          inviteCode,
        })
        .returning();

      const person = await db.query.persons.findFirst({
        where: eq(persons.userId, user.id),
      });
      if (person) {
        await db.insert(players).values({
          tournamentId: tournament.id,
          personId: person.id,
          role: 'commissioner',
        });
      }

      return { tournamentId: tournament.id };
    }),
  );

export const updateTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(updateTournamentSchema)
  .handler(async ({ data }) => {
    await requireCommissioner(data.id);

    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.id),
    });
    if (!existing) throw new Error('Tournament not found');

    await db
      .update(tournaments)
      .set({
        name: data.name,
        description: data.description || null,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, data.id));

    return { tournamentId: data.id };
  });

export const deleteTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);
    await requireTournamentSetup(data.tournamentId);

    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!existing) throw new Error('Tournament not found');

    await db.delete(tournaments).where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });

export const createGuestPersonFn = createServerFn({ method: 'POST' })
  .inputValidator(createGuestSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const [person] = await db
      .insert(persons)
      .values({
        displayName: data.displayName,
        currentHandicap: data.currentHandicap?.toString() ?? null,
        createdByUserId: user.id,
      })
      .returning();

    return { personId: person.id };
  });

export const getMyGuestsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    const guests = await db.query.persons.findMany({
      where: and(
        isNull(persons.userId),
        eq(persons.createdByUserId, user.id),
        isNull(persons.deletedAt),
      ),
      orderBy: (persons, { desc }) => [desc(persons.createdAt)],
    });

    return guests.map((g) => ({
      id: g.id,
      displayName: g.displayName,
      currentHandicap: g.currentHandicap,
      createdAt: g.createdAt,
    }));
  },
);

export const updateGuestFn = createServerFn({ method: 'POST' })
  .inputValidator(updateGuestSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const guest = await db.query.persons.findFirst({
      where: eq(persons.id, data.personId),
    });

    if (!guest) {
      throw new Error('Guest not found');
    }

    if (guest.createdByUserId !== user.id) {
      throw new Error('You can only update guests you created');
    }

    if (guest.deletedAt) {
      throw new Error('This guest has been deleted');
    }

    await db
      .update(persons)
      .set({
        displayName: data.displayName,
        currentHandicap: data.currentHandicap?.toString() ?? null,
        updatedAt: new Date(),
      })
      .where(eq(persons.id, data.personId));

    return { success: true };
  });

export const deleteGuestFn = createServerFn({ method: 'POST' })
  .inputValidator(deleteGuestSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const guest = await db.query.persons.findFirst({
      where: eq(persons.id, data.personId),
    });

    if (!guest) {
      throw new Error('Guest not found');
    }

    if (guest.createdByUserId !== user.id) {
      throw new Error('You can only delete guests you created');
    }

    await db
      .update(persons)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(persons.id, data.personId));

    return { success: true };
  });

export const addPlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(addPlayerSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      const person = await db.query.persons.findFirst({
        where: eq(persons.id, data.personId),
      });
      if (!person) throw new Error('Person not found');

      const isSelfJoin = person.userId === user.id;

      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, data.tournamentId),
      });
      if (!tournament) throw new Error('Tournament not found');
      if (!isTournamentInSetup(tournament.status)) {
        throw new Error(
          'Cannot add players once the tournament has left setup',
        );
      }

      const isCreator = tournament.createdByUserId === user.id;

      if (isSelfJoin) {
        if (
          data.role &&
          data.role !== 'player' &&
          !(data.role === 'commissioner' && isCreator)
        ) {
          throw new Error('You can only join as a player');
        }
      } else {
        if (!isCreator) {
          await requireCommissioner(data.tournamentId);
        }
      }

      return db.transaction(async (tx) => {
        const existingPlayer = await tx.query.players.findFirst({
          where: and(
            eq(players.tournamentId, data.tournamentId),
            eq(players.personId, data.personId),
          ),
        });
        if (existingPlayer) throw new Error('Person is already a player');

        const role = isSelfJoin ? 'player' : (data.role ?? 'player');

        if (person.userId == null && role === 'commissioner') {
          throw new Error('Guests can only be assigned the player role');
        }

        const [player] = await tx
          .insert(players)
          .values({
            tournamentId: data.tournamentId,
            personId: data.personId,
            role,
            handicapOverride: data.handicapOverride?.toString() ?? null,
          })
          .returning();

        const openRounds = await tx.query.rounds.findMany({
          where: and(
            eq(rounds.tournamentId, data.tournamentId),
            eq(rounds.status, 'draft'),
          ),
        });

        for (const round of openRounds) {
          const [rp] = await tx
            .insert(roundPlayers)
            .values({
              roundId: round.id,
              personId: data.personId,
              playerId: player.id,
              handicapSnapshot:
                data.handicapOverride?.toString() ??
                person.currentHandicap ??
                '0',
            })
            .returning();

          const roundGroups = await tx.query.groups.findMany({
            where: eq(groups.roundId, round.id),
          });
          if (roundGroups.length === 1) {
            await tx
              .update(roundPlayers)
              .set({ groupId: roundGroups[0].id })
              .where(eq(roundPlayers.id, rp.id));
          }
        }

        return { playerId: player.id };
      });
    }),
  );

export const updatePlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(updatePlayerSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const existing = await db.query.players.findFirst({
        where: eq(players.id, data.playerId),
        with: { person: true },
      });
      if (!existing) throw new Error('Player not found');

      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, existing.tournamentId),
      });
      if (!tournament) throw new Error('Tournament not found');

      await requireCommissioner(existing.tournamentId);
      await requireTournamentSetup(existing.tournamentId);

      if (
        data.role !== undefined &&
        existing.person.userId == null &&
        data.role === 'commissioner'
      ) {
        throw new Error('Guests can only be assigned the player role');
      }

      if (
        data.role === 'player' &&
        existing.role === 'commissioner' &&
        existing.person.userId === tournament.createdByUserId
      ) {
        throw new Error(
          'The tournament creator cannot be demoted. Please transfer ownership first.',
        );
      }

      if (data.role === 'player' && existing.role === 'commissioner') {
        const commissionerCount = await db.query.players.findMany({
          where: and(
            eq(players.tournamentId, existing.tournamentId),
            eq(players.role, 'commissioner'),
          ),
        });

        if (commissionerCount.length === 1) {
          throw new Error(
            'Cannot demote the last commissioner. Promote another player to commissioner first.',
          );
        }
      }

      const updates: Record<string, unknown> = {};
      if (data.role !== undefined) {
        updates.role = data.role;
      }

      if (data.handicapOverride !== undefined)
        updates.handicapOverride = data.handicapOverride?.toString() ?? null;

      if (Object.keys(updates).length > 0) {
        await db
          .update(players)
          .set(updates)
          .where(eq(players.id, data.playerId));
      }

      return { success: true };
    }),
  );

export const removePlayerFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ playerId: z.string().uuid() }))
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();
      const existing = await db.query.players.findFirst({
        where: eq(players.id, data.playerId),
        with: {
          person: {
            columns: { userId: true },
          },
          tournament: {
            columns: { status: true, createdByUserId: true },
          },
        },
      });
      if (!existing) throw new Error('Player not found');

      const isSelfRemoval = existing.person.userId === user.id;

      if (isSelfRemoval) {
        if (!isTournamentInSetup(existing.tournament.status)) {
          throw new Error(
            'You can only leave while the tournament is in setup',
          );
        }

        if (existing.tournament.createdByUserId === user.id) {
          throw new Error(
            'The tournament creator cannot leave until ownership transfer is available.',
          );
        }
      } else {
        await requireCommissioner(existing.tournamentId);
        await requireTournamentSetup(existing.tournamentId);
      }

      if (existing.role === 'commissioner') {
        const commissionerCount = await db.query.players.findMany({
          where: and(
            eq(players.tournamentId, existing.tournamentId),
            eq(players.role, 'commissioner'),
          ),
        });

        if (commissionerCount.length === 1) {
          throw new Error(
            'Cannot remove the last commissioner. Promote another player to commissioner first.',
          );
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(players).where(eq(players.id, data.playerId));

        await tx
          .update(tournaments)
          .set({ updatedAt: new Date() })
          .where(eq(tournaments.id, existing.tournamentId));
      });

      return { success: true };
    }),
  );

export const getMyPersonFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireAuth();

    const person = await db.query.persons.findFirst({
      where: eq(persons.userId, user.id),
    });

    return person ?? null;
  },
);

export const ensureMyPersonFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await requireAuth();

    return resolveOrCreatePersonForUser(user.id);
  },
);

export const lockTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'setup') {
      throw new Error('Tournament is already locked');
    }

    const tournamentRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, data.tournamentId),
    });
    if (tournamentRounds.length === 0) {
      throw new Error(
        'Cannot lock a tournament with no rounds. Add at least one round first.',
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(rounds)
        .set({ status: 'scheduled', updatedAt: new Date() })
        .where(
          and(
            eq(rounds.tournamentId, data.tournamentId),
            eq(rounds.status, 'draft'),
          ),
        );

      await tx
        .update(tournaments)
        .set({ status: 'scheduled', updatedAt: new Date() })
        .where(eq(tournaments.id, data.tournamentId));
    });

    return { success: true };
  });

export const unlockTournamentFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.status !== 'scheduled') {
      throw new Error(
        'Can only unlock a tournament that is in scheduled status',
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(rounds)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(
          and(
            eq(rounds.tournamentId, data.tournamentId),
            eq(rounds.status, 'scheduled'),
          ),
        );

      await tx
        .update(tournaments)
        .set({ status: 'setup', updatedAt: new Date() })
        .where(eq(tournaments.id, data.tournamentId));
    });

    return { success: true };
  });

export const getTournamentByInviteCodeFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const code = normalizeInviteCode(data.code);

    const tournament = await db.query.tournaments.findFirst({
      where: ilike(tournaments.inviteCode, code),
      columns: { id: true, name: true, status: true },
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament;
  });

export const getTournamentJoinStateFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ code: z.string() }))
  .handler(async ({ data }) => {
    const code = normalizeInviteCode(data.code);
    const tournament = await db.query.tournaments.findFirst({
      where: ilike(tournaments.inviteCode, code),
      columns: { id: true, name: true, status: true },
      with: {
        players: {
          with: {
            person: {
              columns: {
                id: true,
                displayName: true,
                userId: true,
                currentHandicap: true,
              },
            },
            teamMemberships: {
              with: {
                team: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const requestUser = await requireAuth().catch(() => null);
    const person = requestUser
      ? await db.query.persons.findFirst({
          where: eq(persons.userId, requestUser.id),
          columns: { id: true },
        })
      : null;

    const alreadyJoined =
      person != null
        ? tournament.players.some((p) => p.personId === person.id)
        : false;

    const claimableGuests = tournament.players
      .filter((p) => p.person.userId == null)
      .map((p) => ({
        personId: p.person.id,
        displayName: p.person.displayName,
        currentHandicap: p.person.currentHandicap,
        teamName: p.teamMemberships[0]?.team.name ?? null,
      }))
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: 'base',
        }),
      );

    return {
      tournament,
      isAuthenticated: requestUser != null,
      alreadyJoined,
      claimableGuests,
    };
  });

export const joinTournamentByCodeFn = createServerFn({ method: 'POST' })
  .inputValidator(joinByCodeSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      const tournament = await db.query.tournaments.findFirst({
        where: ilike(tournaments.inviteCode, normalizeInviteCode(data.code)),
      });

      if (!tournament) {
        throw new Error('Invalid invite code');
      }

      if (tournament.status !== 'setup' && tournament.status !== 'scheduled') {
        throw new Error(
          'This tournament has already started and is not accepting new players',
        );
      }

      const person = await resolveOrCreatePersonForUser(user.id);

      const existingPlayer = await db.query.players.findFirst({
        where: and(
          eq(players.tournamentId, tournament.id),
          eq(players.personId, person.id),
        ),
      });

      if (existingPlayer) {
        return {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          alreadyJoined: true,
        };
      }

      const guestPersonId = data.guestPersonId;

      if (guestPersonId) {
        return db.transaction(async (tx) => {
          const guestPlayer = await tx.query.players.findFirst({
            where: and(
              eq(players.tournamentId, tournament.id),
              eq(players.personId, guestPersonId),
            ),
            with: {
              person: true,
            },
          });

          if (!guestPlayer) {
            throw new Error('That guest is not available to claim.');
          }

          if (guestPlayer.person.userId != null) {
            throw new Error('That guest has already been claimed.');
          }

          const duplicatePlayer = await tx.query.players.findFirst({
            where: and(
              eq(players.tournamentId, tournament.id),
              eq(players.personId, person.id),
            ),
          });

          if (duplicatePlayer) {
            throw new Error('You are already in this tournament.');
          }

          await tx
            .update(players)
            .set({
              personId: person.id,
              handicapOverride:
                guestPlayer.handicapOverride ??
                guestPlayer.person.currentHandicap ??
                null,
            })
            .where(eq(players.id, guestPlayer.id));

          await tx
            .update(roundPlayers)
            .set({ personId: person.id })
            .where(
              and(
                eq(roundPlayers.playerId, guestPlayer.id),
                eq(roundPlayers.personId, guestPlayer.person.id),
              ),
            );

          return {
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            joinedByClaimingGuest: true,
          };
        });
      }

      const [player] = await db
        .insert(players)
        .values({
          tournamentId: tournament.id,
          personId: person.id,
          role: 'player',
        })
        .returning();

      const openRounds = await db.query.rounds.findMany({
        where: and(
          eq(rounds.tournamentId, tournament.id),
          or(eq(rounds.status, 'draft'), eq(rounds.status, 'scheduled')),
        ),
      });

      for (const round of openRounds) {
        const [rp] = await db
          .insert(roundPlayers)
          .values({
            roundId: round.id,
            personId: person.id,
            playerId: player.id,
            handicapSnapshot: person.currentHandicap ?? '0',
          })
          .returning();

        const roundGroups = await db.query.groups.findMany({
          where: eq(groups.roundId, round.id),
        });
        if (roundGroups.length === 1) {
          await db
            .update(roundPlayers)
            .set({ groupId: roundGroups[0].id })
            .where(eq(roundPlayers.id, rp.id));
        }
      }

      return {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        joinedByClaimingGuest: false,
      };
    }),
  );

export const getTournamentInviteCodeFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
      columns: { id: true, name: true, inviteCode: true },
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament;
  });
