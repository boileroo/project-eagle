import { createServerFn } from '@tanstack/react-start';
import { db } from '@/db';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

import {
  persons,
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
import { resolveOrCreatePersonForUser } from './server/persons.server';
import { generateInviteCode } from './server/invite-codes.server';
import { safeHandler } from './server/server-utils.server';
import { createEventSchema } from './validators';

export const createEventFn = createServerFn({ method: 'POST' })
  .inputValidator(createEventSchema)
  .handler(
    safeHandler(async ({ data }) => {
      const user = await requireAuth();

      const result = await db.transaction(async (tx) => {
        const creatorPerson = await resolveOrCreatePersonForUser(user.id);

        const personIds: string[] = [creatorPerson.id];

        for (let i = 1; i < data.players.length; i++) {
          const p = data.players[i];
          const [guest] = await tx
            .insert(persons)
            .values({
              displayName: p.displayName,
              currentHandicap: p.currentHandicap?.toString() ?? null,
              createdByUserId: user.id,
            })
            .returning({ id: persons.id });
          personIds.push(guest.id);
        }

        const inviteCode = generateInviteCode();
        const [tournament] = await tx
          .insert(tournaments)
          .values({
            name: data.tournamentName,
            description: data.description ?? null,
            isSingleRound: data.isSingleRound,
            createdByUserId: user.id,
            inviteCode,
          })
          .returning({ id: tournaments.id });

        const playerIds: string[] = [];

        for (let i = 0; i < personIds.length; i++) {
          const playerData = data.players[i];
          const [tp] = await tx
            .insert(players)
            .values({
              tournamentId: tournament.id,
              personId: personIds[i],
              role: i === 0 ? 'commissioner' : 'player',
              handicapOverride: playerData.currentHandicap?.toString() ?? null,
            })
            .returning({ id: players.id });
          playerIds.push(tp.id);
        }

        for (const team of data.teams) {
          const [tt] = await tx
            .insert(teams)
            .values({
              tournamentId: tournament.id,
              name: team.name,
            })
            .returning({ id: teams.id });

          for (const playerIdx of team.playerIndices) {
            const playerId = playerIds[playerIdx];
            if (playerId) {
              await tx.insert(teamMembers).values({
                teamId: tt.id,
                playerId,
              });
            }
          }
        }

        let firstRoundId: string | null = null;

        for (let roundIdx = 0; roundIdx < data.rounds.length; roundIdx++) {
          const roundData = data.rounds[roundIdx];

          const dateValue = roundData.date ? new Date(roundData.date) : null;

          const [round] = await tx
            .insert(rounds)
            .values({
              tournamentId: tournament.id,
              courseId: roundData.courseId,
              roundNumber: roundIdx + 1,
              date: dateValue,
              teeTime: roundData.teeTime ?? null,
              status: 'draft',
              createdByUserId: user.id,
            })
            .returning({ id: rounds.id });

          if (roundIdx === 0) firstRoundId = round.id;

          const playerCount = personIds.length;
          const groupCount = Math.ceil(playerCount / 4);
          const createdGroupIds: string[] = [];

          for (let gIdx = 0; gIdx < groupCount; gIdx++) {
            const [rg] = await tx
              .insert(groups)
              .values({
                roundId: round.id,
                groupNumber: gIdx + 1,
                name: groupCount > 1 ? `Group ${gIdx + 1}` : null,
              })
              .returning({ id: groups.id });
            createdGroupIds.push(rg.id);
          }

          for (let i = 0; i < personIds.length; i++) {
            const playerData = data.players[i];
            const groupId = createdGroupIds[i % groupCount];
            await tx.insert(roundPlayers).values({
              roundId: round.id,
              personId: personIds[i],
              playerId: playerIds[i],
              groupId,
              handicapSnapshot: playerData.currentHandicap?.toString() ?? '0',
            });
          }

          for (const comp of roundData.competitions) {
            if (comp.competitionCategory === 'bonus') continue;
            for (const groupId of createdGroupIds) {
              await tx.insert(games).values({
                tournamentId: tournament.id,
                roundId: round.id,
                groupId,
                name: comp.name,
                format: comp.competitionConfig.formatType,
                config: comp.competitionConfig.config as unknown as Record<
                  string,
                  JsonValue
                >,
              });
            }
          }
        }

        return {
          tournamentId: tournament.id,
          firstRoundId: firstRoundId!,
        };
      });

      return result;
    }),
  );
