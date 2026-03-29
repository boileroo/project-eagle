import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '@/db';
import { rounds, scoreEvents } from '@/db/schema';
import { requireTournamentParticipant } from './server/auth.helpers.server';
import { resolveLatestScores } from './server/score-events.server';
import { resolveEffectiveHandicap, getPlayingHandicap } from './handicaps';
import type {
  HoleData,
  ParticipantData,
  ResolvedScore,
  GroupData,
  TeamData,
  CompetitionInput,
} from './domain/index';
import { calculateGroupedResults } from './domain';
import { collectTeamPoints, type TeamPointsEntry } from './domain/team-points';
import type { CompetitionConfig } from './competitions';

/**
 * Aggregates team competition points across all rounds in a tournament.
 * Includes both open and finalised rounds. Used to compute overall
 * tournament team standings for display in the competitions banner.
 */
export const getTournamentTeamPointsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);

    const tournamentRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, data.tournamentId),
      orderBy: (r, { asc }) => [asc(r.roundNumber)],
      with: {
        course: {
          with: { holes: { orderBy: (h, { asc }) => [asc(h.holeNumber)] } },
        },
        groups: { orderBy: (g, { asc }) => [asc(g.groupNumber)] },
        participants: {
          with: {
            person: true,
            tournamentParticipant: {
              with: {
                teamMemberships: {
                  with: { team: true },
                },
              },
            },
          },
        },
        competitions: { with: { bonusAwards: true } },
      },
    });

    const allRoundIds = tournamentRounds.map((r) => r.id);
    const allEvents =
      allRoundIds.length > 0
        ? await db.query.scoreEvents.findMany({
            where: inArray(scoreEvents.roundId, allRoundIds),
            orderBy: [desc(scoreEvents.createdAt)],
          })
        : [];

    const eventsByRound = new Map<string, (typeof allEvents)[number][]>();
    for (const ev of allEvents) {
      const arr = eventsByRound.get(ev.roundId) ?? [];
      arr.push(ev);
      eventsByRound.set(ev.roundId, arr);
    }

    const totals = new Map<string, TeamPointsEntry>();
    const addPoints = (teamId: string, teamName: string, points: number) => {
      const existing = totals.get(teamId) ?? { teamId, teamName, points: 0 };
      existing.points += points;
      totals.set(teamId, existing);
    };

    for (const round of tournamentRounds) {
      const events = eventsByRound.get(round.id) ?? [];
      const resolvedScores: ResolvedScore[] = resolveLatestScores(events).map(
        (e) => ({
          roundParticipantId: e.roundParticipantId,
          holeNumber: e.holeNumber,
          strokes: e.strokes,
        }),
      );

      const holes: HoleData[] = round.course.holes.map((h) => ({
        holeNumber: h.holeNumber,
        par: h.par,
        strokeIndex: h.strokeIndex,
      }));

      const participants: ParticipantData[] = round.participants.map((rp) => {
        const tp = rp.tournamentParticipant as
          | { handicapOverride: string | null }
          | null
          | undefined;
        const effectiveHC = resolveEffectiveHandicap({
          handicapOverride: rp.handicapOverride,
          handicapSnapshot: rp.handicapSnapshot,
          tournamentParticipant: tp
            ? { handicapOverride: tp.handicapOverride }
            : null,
        });
        return {
          roundParticipantId: rp.id,
          personId: rp.person.id,
          displayName: rp.person.displayName,
          effectiveHandicap: effectiveHC,
          playingHandicap: getPlayingHandicap(effectiveHC),
          roundGroupId: rp.roundGroupId ?? null,
        };
      });

      const groups: GroupData[] = round.groups.map((g) => ({
        roundGroupId: g.id,
        groupNumber: g.groupNumber,
        name: g.name ?? null,
        memberParticipantIds: round.participants
          .filter((rp) => rp.roundGroupId === g.id)
          .map((rp) => rp.id),
      }));

      const teamMap = new Map<
        string,
        { teamId: string; name: string; memberParticipantIds: string[] }
      >();
      for (const rp of round.participants) {
        const memberships =
          (
            rp.tournamentParticipant as
              | { teamMemberships?: { team: { id: string; name: string } }[] }
              | null
              | undefined
          )?.teamMemberships ?? [];
        for (const tm of memberships) {
          const entry = teamMap.get(tm.team.id) ?? {
            teamId: tm.team.id,
            name: tm.team.name,
            memberParticipantIds: [],
          };
          if (!entry.memberParticipantIds.includes(rp.id))
            entry.memberParticipantIds.push(rp.id);
          teamMap.set(tm.team.id, entry);
        }
      }
      const teams: TeamData[] = [...teamMap.values()].map((t) => ({
        ...t,
        tournamentTeamId: t.teamId,
      }));

      const TEAM_APPLICABLE = new Set(['best_ball', 'hi_lo', 'match_play']);
      if (round.status === 'finalized') TEAM_APPLICABLE.add('rumble');

      for (const comp of round.competitions) {
        if (!TEAM_APPLICABLE.has(comp.formatType)) continue;

        const config = {
          formatType: comp.formatType,
          config: comp.configJson ?? {},
        } as CompetitionConfig;
        const groupScope =
          comp.formatType === 'rumble'
            ? ('all' as const)
            : ((comp.groupScope ?? 'all') as 'all' | 'within_group');
        const input: CompetitionInput = {
          competition: {
            id: comp.id,
            name: comp.name,
            config,
            groupScope,
            roundGroupId: null,
          },
          holes,
          participants,
          scores: resolvedScores,
          teams,
          groups,
        };

        try {
          const grouped = calculateGroupedResults(input);
          if (grouped.scope === 'all') {
            for (const e of collectTeamPoints(grouped.result, teams))
              addPoints(e.teamId, e.teamName, e.points);
          } else {
            for (const gr of grouped.results)
              for (const e of collectTeamPoints(gr.result, teams))
                addPoints(e.teamId, e.teamName, e.points);
          }
        } catch {
          // ignore engines that fail for this round
        }
      }
    }

    return {
      roundCount: tournamentRounds.length,
      standings: [...totals.values()].sort((a, b) => b.points - a.points),
    };
  });
