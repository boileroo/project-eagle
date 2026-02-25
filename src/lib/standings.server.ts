import { createServerFn } from '@tanstack/react-start';
import { eq, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  rounds,
  scoreEvents,
  tournamentStandings,
  tournamentTeams,
} from '@/db/schema';
import {
  requireAuth,
  verifyTournamentMembership,
  requireCommissioner,
  requireTournamentParticipant,
} from './server/auth.helpers.server';
import { resolveEffectiveHandicap, getPlayingHandicap } from './handicaps';
import { resolveLatestScores } from './scores.server';
import { calculateStandings } from './domain/standings';
import type {
  RoundCompetitionData,
  ContributorBonusAward,
  StandingsResult,
} from './domain/standings';
import type {
  HoleData,
  ParticipantData,
  ResolvedScore,
  GroupData,
  TeamData,
  CompetitionInput,
} from './domain/index';
import { isBonusFormat } from './competitions';
import type { CompetitionConfig } from './competitions';
import { aggregationConfigSchema } from './competitions';
import { checkRateLimit } from './server/rate-limit.server';
import {
  createTournamentStandingSchema,
  updateTournamentStandingSchema,
} from './validators';

export const getTournamentStandingsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
    return db.query.tournamentStandings.findMany({
      where: eq(tournamentStandings.tournamentId, data.tournamentId),
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    });
  });

export const createTournamentStandingFn = createServerFn({ method: 'POST' })
  .inputValidator(createTournamentStandingSchema)
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    const parsed = aggregationConfigSchema.parse(data.aggregationConfig);

    const [standing] = await db
      .insert(tournamentStandings)
      .values({
        tournamentId: data.tournamentId,
        name: data.name,
        participantType: data.participantType,
        aggregationConfig: parsed,
      })
      .returning();

    return standing;
  });

export const updateTournamentStandingFn = createServerFn({ method: 'POST' })
  .inputValidator(updateTournamentStandingSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentStandings.findFirst({
      where: eq(tournamentStandings.id, data.id),
    });
    if (!existing) throw new Error('Standing not found');

    await requireCommissioner(existing.tournamentId);

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.aggregationConfig !== undefined) {
      const parsed = aggregationConfigSchema.parse(data.aggregationConfig);
      updates.aggregationConfig = parsed;
    }
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(tournamentStandings)
      .set(updates)
      .where(eq(tournamentStandings.id, data.id))
      .returning();

    return updated;
  });

export const deleteTournamentStandingFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ standingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.tournamentStandings.findFirst({
      where: eq(tournamentStandings.id, data.standingId),
    });
    if (!existing) throw new Error('Standing not found');

    await requireCommissioner(existing.tournamentId);

    await db
      .delete(tournamentStandings)
      .where(eq(tournamentStandings.id, data.standingId));

    return { success: true };
  });

export const computeStandingsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ standingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    if (!checkRateLimit(`standings:${user.id}`, 30, 60_000)) {
      throw new Error('Too many requests. Please slow down.');
    }

    const standing = await db.query.tournamentStandings.findFirst({
      where: eq(tournamentStandings.id, data.standingId),
    });
    if (!standing) throw new Error('Standing not found');

    await verifyTournamentMembership(user.id, standing.tournamentId);

    const aggregationConfig = aggregationConfigSchema.parse(
      standing.aggregationConfig,
    );

    let tTeams: {
      id: string;
      name: string;
      members: { participantId: string }[];
    }[] = [];
    if (standing.participantType === 'team') {
      tTeams = await db.query.tournamentTeams.findMany({
        where: eq(tournamentTeams.tournamentId, standing.tournamentId),
        columns: { id: true, name: true },
        with: { members: { columns: { participantId: true } } },
      });
    }

    const tournamentRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, standing.tournamentId),
      orderBy: (r, { asc }) => [asc(r.roundNumber)],
      with: {
        course: {
          with: {
            holes: {
              orderBy: (holes, { asc }) => [asc(holes.holeNumber)],
            },
          },
        },
        groups: {
          orderBy: (g, { asc }) => [asc(g.groupNumber)],
        },
        participants: {
          with: {
            person: true,
            tournamentParticipant: true,
          },
        },
        competitions: {
          with: {
            bonusAwards: true,
          },
        },
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
    for (const event of allEvents) {
      const arr = eventsByRound.get(event.roundId) ?? [];
      arr.push(event);
      eventsByRound.set(event.roundId, arr);
    }

    const roundDatas: RoundCompetitionData[] = [];
    const allContributorBonuses: ContributorBonusAward[] = [];

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
        const effectiveHC = resolveEffectiveHandicap({
          handicapOverride: rp.handicapOverride,
          handicapSnapshot: rp.handicapSnapshot,
          tournamentParticipant: rp.tournamentParticipant
            ? { handicapOverride: rp.tournamentParticipant.handicapOverride }
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
        name: g.name ?? '',
        memberParticipantIds: round.participants
          .filter((rp) => rp.roundGroupId === g.id)
          .map((rp) => rp.id),
      }));

      const tpToRp = new Map<string, string>();
      for (const rp of round.participants) {
        if (rp.tournamentParticipantId) {
          tpToRp.set(rp.tournamentParticipantId, rp.id);
        }
      }
      const teams: TeamData[] = tTeams.map((tt) => ({
        teamId: tt.id,
        name: tt.name,
        tournamentTeamId: tt.id,
        memberParticipantIds: tt.members
          .map((m) => tpToRp.get(m.participantId))
          .filter((id): id is string => id != null),
      }));

      const competitionInputs: CompetitionInput[] = round.competitions
        .filter(
          (c) =>
            !isBonusFormat(c.formatType as CompetitionConfig['formatType']),
        )
        .map((c) => ({
          competition: {
            id: c.id,
            name: c.name,
            config: {
              formatType: c.formatType,
              config: c.configJson ?? {},
            } as CompetitionConfig,
            groupScope: (c.groupScope ?? 'all') as 'all' | 'within_group',
          },
          holes,
          participants,
          scores: resolvedScores,
          teams,
          groups,
        }));

      roundDatas.push({
        roundId: round.id,
        roundNumber: round.roundNumber,
        groups,
        competitionInputs,
      });

      for (const comp of round.competitions) {
        if (!isBonusFormat(comp.formatType as CompetitionConfig['formatType']))
          continue;
        const bonusConfig = comp.configJson as {
          bonusMode?: string;
          bonusPoints?: number;
        } | null;
        if (bonusConfig?.bonusMode !== 'contributor') continue;

        for (const award of comp.bonusAwards) {
          allContributorBonuses.push({
            roundId: round.id,
            roundNumber: round.roundNumber,
            roundParticipantId: award.roundParticipantId,
            bonusPoints: bonusConfig.bonusPoints ?? 1,
          });
        }
      }
    }

    const result: StandingsResult = calculateStandings(
      aggregationConfig,
      roundDatas,
      standing.participantType as 'individual' | 'team',
      allContributorBonuses,
    );

    return {
      standing: {
        id: standing.id,
        name: standing.name,
        participantType: standing.participantType,
        aggregationConfig,
      },
      rounds: tournamentRounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        courseName: r.course.name,
      })),
      leaderboard: result.leaderboard,
      sortDirection: result.sortDirection,
    };
  });
