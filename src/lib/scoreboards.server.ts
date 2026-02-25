import { createServerFn } from '@tanstack/react-start';
import { eq, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { rounds, scoreEvents, tournaments } from '@/db/schema';
import {
  requireAuth,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { resolveEffectiveHandicap, getPlayingHandicap } from './handicaps';
import { resolveLatestScores } from './scores.server';
import type { HoleData, ParticipantData, ResolvedScore } from './domain/index';
import {
  calculateIndividualScoreboard,
  type IndividualScoreboardInput,
  type BonusAwardInput,
} from './domain/individual-scoreboard';
import {
  calculateTournamentLeaderboard,
  type TournamentLeaderboardRoundInput,
} from './domain/tournament-leaderboard';

async function buildRoundScoreboardInput(roundId: string) {
  const round = await db.query.rounds.findFirst({
    where: eq(rounds.id, roundId),
    with: {
      course: {
        with: {
          holes: { orderBy: (h, { asc }) => [asc(h.holeNumber)] },
        },
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
  if (!round) throw new Error('Round not found');

  const events = await db.query.scoreEvents.findMany({
    where: eq(scoreEvents.roundId, roundId),
    orderBy: [desc(scoreEvents.createdAt)],
  });

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

  const bonusAwardInputs: BonusAwardInput[] = [];
  for (const comp of round.competitions) {
    if (
      comp.formatType !== 'nearest_pin' &&
      comp.formatType !== 'longest_drive'
    )
      continue;
    const cfg = comp.configJson as {
      bonusMode?: string;
      bonusPoints?: number;
      holeNumber?: number;
    } | null;
    const bonusMode =
      cfg?.bonusMode === 'standalone' ? 'standalone' : 'contributor';
    const bonusPoints = cfg?.bonusPoints ?? 1;
    const holeNumber = cfg?.holeNumber ?? 0;
    for (const award of comp.bonusAwards) {
      bonusAwardInputs.push({
        competitionId: comp.id,
        competitionName: comp.name,
        formatType: comp.formatType as 'nearest_pin' | 'longest_drive',
        bonusMode,
        bonusPoints,
        holeNumber,
        roundParticipantId: award.roundParticipantId,
      });
    }
    if (comp.bonusAwards.length === 0) {
      bonusAwardInputs.push({
        competitionId: comp.id,
        competitionName: comp.name,
        formatType: comp.formatType as 'nearest_pin' | 'longest_drive',
        bonusMode,
        bonusPoints,
        holeNumber,
        roundParticipantId: null,
      });
    }
  }

  const input: IndividualScoreboardInput = {
    holes,
    participants,
    scores: resolvedScores,
    bonusAwards: bonusAwardInputs,
  };

  return { round, input };
}

export const getIndividualScoreboardFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);

    const { round, input } = await buildRoundScoreboardInput(data.roundId);
    const result = calculateIndividualScoreboard(input);

    return {
      roundId: round.id,
      roundNumber: round.roundNumber,
      courseName: round.course.name,
      totalHoles: round.course.holes.length,
      primaryScoringBasis: round.primaryScoringBasis ?? null,
      ...result,
    };
  });

export const getTournamentLeaderboardFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    await verifyTournamentMembership(user.id, data.tournamentId);

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
      columns: { primaryScoringBasis: true },
    });
    if (!tournament) throw new Error('Tournament not found');

    const tournamentRounds = await db.query.rounds.findMany({
      where: eq(rounds.tournamentId, data.tournamentId),
      orderBy: (r, { asc }) => [asc(r.roundNumber)],
      with: {
        course: {
          with: {
            holes: { orderBy: (h, { asc }) => [asc(h.holeNumber)] },
          },
        },
        participants: {
          with: { person: true, tournamentParticipant: true },
        },
        competitions: {
          with: { bonusAwards: true },
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

    const leaderboardRounds: TournamentLeaderboardRoundInput[] = [];

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

      const bonusAwardInputs: BonusAwardInput[] = [];
      for (const comp of round.competitions) {
        if (
          comp.formatType !== 'nearest_pin' &&
          comp.formatType !== 'longest_drive'
        )
          continue;
        const cfg = comp.configJson as {
          bonusMode?: string;
          bonusPoints?: number;
          holeNumber?: number;
        } | null;
        const bonusMode =
          cfg?.bonusMode === 'standalone' ? 'standalone' : 'contributor';
        const bonusPoints = cfg?.bonusPoints ?? 1;
        const holeNumber = cfg?.holeNumber ?? 0;
        for (const award of comp.bonusAwards) {
          bonusAwardInputs.push({
            competitionId: comp.id,
            competitionName: comp.name,
            formatType: comp.formatType as 'nearest_pin' | 'longest_drive',
            bonusMode,
            bonusPoints,
            holeNumber,
            roundParticipantId: award.roundParticipantId,
          });
        }
        if (comp.bonusAwards.length === 0) {
          bonusAwardInputs.push({
            competitionId: comp.id,
            competitionName: comp.name,
            formatType: comp.formatType as 'nearest_pin' | 'longest_drive',
            bonusMode,
            bonusPoints,
            holeNumber,
            roundParticipantId: null,
          });
        }
      }

      const scoreboardResult = calculateIndividualScoreboard({
        holes,
        participants,
        scores: resolvedScores,
        bonusAwards: bonusAwardInputs,
      });

      leaderboardRounds.push({
        roundId: round.id,
        roundName: `Round ${round.roundNumber} — ${round.course.name}`,
        isFinalised: round.status === 'finalized',
        totalHoles: round.course.holes.length,
        scoreboardRows: scoreboardResult.rows,
      });
    }

    const leaderboardResult = calculateTournamentLeaderboard({
      rounds: leaderboardRounds,
    });

    return {
      tournamentId: data.tournamentId,
      primaryScoringBasis: tournament.primaryScoringBasis ?? null,
      rounds: leaderboardRounds.map((r) => ({
        roundId: r.roundId,
        roundName: r.roundName,
        isFinalised: r.isFinalised,
        totalHoles: r.totalHoles,
      })),
      ...leaderboardResult,
    };
  });

const primaryScoringBasisSchema = z
  .enum(['gross_strokes', 'net_strokes', 'stableford', 'total'])
  .nullable();

export const setRoundPrimaryScoringBasisFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      roundId: z.string().uuid(),
      basis: primaryScoringBasisSchema,
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!round) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, round.tournamentId);

    await db
      .update(rounds)
      .set({ primaryScoringBasis: data.basis })
      .where(eq(rounds.id, data.roundId));

    return { success: true };
  });

export const setTournamentPrimaryScoringBasisFn = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z.object({
      tournamentId: z.string().uuid(),
      basis: primaryScoringBasisSchema,
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    await verifyTournamentMembership(user.id, data.tournamentId);

    await db
      .update(tournaments)
      .set({ primaryScoringBasis: data.basis })
      .where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });
