import { createServerFn } from '@tanstack/react-start';
import { db } from '@/db';
import { deriveGroupScope } from './competition-config';

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
  tournamentParticipants,
  tournamentTeams,
  tournamentTeamMembers,
  rounds,
  roundGroups,
  roundParticipants,
  competitions,
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
        // 1. Ensure the creator has a person record
        const creatorPerson = await resolveOrCreatePersonForUser(user.id);

        // 2. Create guest persons for players index > 0
        //    Player at index 0 is always the creator
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

        // 3. Create tournament
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

        // 4. Add all players as tournament participants
        //    Creator is commissioner; rest are players
        const tournamentParticipantIds: string[] = [];

        for (let i = 0; i < personIds.length; i++) {
          const playerData = data.players[i];
          const [tp] = await tx
            .insert(tournamentParticipants)
            .values({
              tournamentId: tournament.id,
              personId: personIds[i],
              role: i === 0 ? 'commissioner' : 'player',
              handicapOverride: playerData.currentHandicap?.toString() ?? null,
            })
            .returning({ id: tournamentParticipants.id });
          tournamentParticipantIds.push(tp.id);
        }

        // 5. Create teams and assign members
        for (const team of data.teams) {
          const [tt] = await tx
            .insert(tournamentTeams)
            .values({
              tournamentId: tournament.id,
              name: team.name,
            })
            .returning({ id: tournamentTeams.id });

          for (const playerIdx of team.playerIndices) {
            const participantId = tournamentParticipantIds[playerIdx];
            if (participantId) {
              await tx.insert(tournamentTeamMembers).values({
                teamId: tt.id,
                participantId,
              });
            }
          }
        }

        // 6. Create rounds
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

          // 6a. Create balanced groups of ≤4 players, distributed as evenly
          //     as possible. For ≤4 players this is always one group.
          const playerCount = personIds.length;
          const groupCount = Math.ceil(playerCount / 4);
          const createdGroupIds: string[] = [];

          for (let gIdx = 0; gIdx < groupCount; gIdx++) {
            const [rg] = await tx
              .insert(roundGroups)
              .values({
                roundId: round.id,
                groupNumber: gIdx + 1,
                name: groupCount > 1 ? `Group ${gIdx + 1}` : null,
              })
              .returning({ id: roundGroups.id });
            createdGroupIds.push(rg.id);
          }

          // 6b. Assign participants to groups round-robin so sizes are balanced
          for (let i = 0; i < personIds.length; i++) {
            const playerData = data.players[i];
            const groupId = createdGroupIds[i % groupCount];
            await tx.insert(roundParticipants).values({
              roundId: round.id,
              personId: personIds[i],
              tournamentParticipantId: tournamentParticipantIds[i],
              roundGroupId: groupId,
              handicapSnapshot: playerData.currentHandicap?.toString() ?? '0',
            });
          }

          // 6c. Create competitions — within_group competitions use roundGroupId=null
          //     so they apply to all groups (each group gets its own leaderboard).
          for (const comp of roundData.competitions) {
            const groupScope = deriveGroupScope(comp.competitionCategory);
            await tx.insert(competitions).values({
              tournamentId: tournament.id,
              roundId: round.id,
              roundGroupId: null,
              name: comp.name,
              competitionCategory: comp.competitionCategory,
              groupScope,
              formatType: comp.competitionConfig.formatType,
              configJson: comp.competitionConfig.config as unknown as Record<
                string,
                JsonValue
              >,
            });
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
