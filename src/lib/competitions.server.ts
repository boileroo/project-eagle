import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  competitions,
  bonusAwards,
  rounds,
  scoreEvents,
  tournamentStandings,
  tournamentTeams,
  gameDecisions,
  tournaments,
} from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  requireCommissionerOrMarker,
  requireTournamentParticipant,
  verifyTournamentMembership,
} from './auth.helpers';
import {
  competitionConfigSchema,
  aggregationConfigSchema,
  isBonusFormat,
} from './competitions';
import type { CompetitionConfig } from './competitions';
import { resolveEffectiveHandicap, getPlayingHandicap } from './handicaps';
import { checkRateLimit } from './rate-limit';
import { resolveLatestScores } from './scores.server';
import { calculateStandings } from './domain/standings';
import type {
  RoundCompetitionData,
  ContributorBonusAward,
  StandingsResult,
} from './domain/standings';
import type {
  CompetitionInput,
  HoleData,
  ParticipantData,
  ResolvedScore,
  GroupData,
  TeamData,
} from './domain/index';
import {
  calculateIndividualScoreboard,
  type IndividualScoreboardInput,
  type BonusAwardInput,
} from './domain/individual-scoreboard';
import {
  calculateTournamentLeaderboard,
  type TournamentLeaderboardRoundInput,
} from './domain/tournament-leaderboard';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  awardBonusSchema,
  createTournamentStandingSchema,
  updateTournamentStandingSchema,
} from './validators';

// ──────────────────────────────────────────────
// List all competitions for a tournament
// ──────────────────────────────────────────────

export const getCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
    return db.query.competitions.findMany({
      where: eq(competitions.tournamentId, data.tournamentId),
      orderBy: (competitions, { asc }) => [asc(competitions.createdAt)],
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: { person: true },
            },
          },
        },
      },
    });
  });

// ──────────────────────────────────────────────
// List competitions for a specific round
// ──────────────────────────────────────────────

export const getRoundCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ roundId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    // IDOR: verify the requesting user is a participant in this round's tournament
    const roundForAuth = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!roundForAuth) throw new Error('Round not found');
    await verifyTournamentMembership(user.id, roundForAuth.tournamentId);
    return db.query.competitions.findMany({
      where: eq(competitions.roundId, data.roundId),
      orderBy: (competitions, { asc }) => [asc(competitions.createdAt)],
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: { person: true },
            },
          },
        },
      },
    });
  });

// ──────────────────────────────────────────────
// Get a single competition
// ──────────────────────────────────────────────

export const getCompetitionFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: { person: true },
            },
          },
        },
      },
    });
    // IDOR: verify the requesting user is a participant in this tournament
    if (comp) {
      await verifyTournamentMembership(user.id, comp.tournamentId);
    }
    return comp;
  });

// ──────────────────────────────────────────────
// Create a competition (commissioner only)
// ──────────────────────────────────────────────

export const createCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator(createCompetitionSchema)
  .handler(async ({ data }) => {
    await requireCommissioner(data.tournamentId);

    // Validate the config via Zod discriminated union
    const parsed = competitionConfigSchema.parse(data.competitionConfig);

    // Verify the round belongs to this tournament
    const round = await db.query.rounds.findFirst({
      where: and(
        eq(rounds.id, data.roundId),
        eq(rounds.tournamentId, data.tournamentId),
      ),
    });
    if (!round) throw new Error('Round not found in this tournament');

    const [comp] = await db
      .insert(competitions)
      .values({
        tournamentId: data.tournamentId,
        roundId: data.roundId,
        name: data.name,
        competitionCategory: data.competitionCategory,
        groupScope: data.groupScope ?? 'all',
        formatType: parsed.formatType,
        configJson: parsed.config,
      })
      .returning();

    return comp;
  });

// ──────────────────────────────────────────────
// Update a competition (commissioner only)
// ──────────────────────────────────────────────

export const updateCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator(updateCompetitionSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.id),
    });
    if (!existing) throw new Error('Competition not found');

    await requireCommissioner(existing.tournamentId);

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.groupScope !== undefined) updates.groupScope = data.groupScope;
    if (data.competitionConfig !== undefined) {
      const parsed = competitionConfigSchema.parse(data.competitionConfig);
      updates.formatType = parsed.formatType;
      updates.configJson = parsed.config;
    }
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(competitions)
      .set(updates)
      .where(eq(competitions.id, data.id))
      .returning();

    return updated;
  });

// ──────────────────────────────────────────────
// Delete a competition (commissioner only)
// ──────────────────────────────────────────────

export const deleteCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const existing = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
    });
    if (!existing) throw new Error('Competition not found');

    await requireCommissioner(existing.tournamentId);

    await db
      .delete(competitions)
      .where(eq(competitions.id, data.competitionId));
    return { success: true };
  });

// ──────────────────────────────────────────────
// Award a bonus (NTP/LD) — commissioner or marker
// ──────────────────────────────────────────────

export const awardBonusFn = createServerFn({ method: 'POST' })
  .inputValidator(awardBonusSchema)
  .handler(async ({ data }) => {
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
    });
    if (!comp) throw new Error('Competition not found');
    if (
      comp.formatType !== 'nearest_pin' &&
      comp.formatType !== 'longest_drive'
    ) {
      throw new Error('Can only award bonuses for NTP/LD competitions');
    }

    const user = await requireCommissionerOrMarker(comp.tournamentId);

    // Delete any existing award (only one winner per bonus comp)
    await db
      .delete(bonusAwards)
      .where(eq(bonusAwards.competitionId, data.competitionId));

    const [award] = await db
      .insert(bonusAwards)
      .values({
        competitionId: data.competitionId,
        roundParticipantId: data.roundParticipantId,
        awardedByUserId: user.id,
      })
      .returning();

    return award;
  });

// ──────────────────────────────────────────────
// Remove a bonus award — commissioner only
// ──────────────────────────────────────────────

export const removeBonusAwardFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
    });
    if (!comp) throw new Error('Competition not found');

    await requireCommissioner(comp.tournamentId);

    await db
      .delete(bonusAwards)
      .where(eq(bonusAwards.competitionId, data.competitionId));

    return { success: true };
  });

// ══════════════════════════════════════════════
// Tournament Standings
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
// List standings for a tournament
// ──────────────────────────────────────────────

export const getTournamentStandingsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);
    return db.query.tournamentStandings.findMany({
      where: eq(tournamentStandings.tournamentId, data.tournamentId),
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    });
  });

// ──────────────────────────────────────────────
// Create a tournament standing (commissioner only)
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Update a tournament standing (commissioner only)
// ──────────────────────────────────────────────

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
      updates.aggregationConfig = aggregationConfigSchema.parse(
        data.aggregationConfig,
      );
    }
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(tournamentStandings)
      .set(updates)
      .where(eq(tournamentStandings.id, data.id))
      .returning();

    return updated;
  });

// ──────────────────────────────────────────────
// Delete a tournament standing (commissioner only)
// ──────────────────────────────────────────────

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

// ══════════════════════════════════════════════
// Individual Scoreboard
// ══════════════════════════════════════════════

/**
 * Helper: build the common per-round data (holes, participants, scores, groups)
 * shared by both the scoreboard and leaderboard server functions.
 */
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

  // Build bonus award inputs from all bonus competitions in this round
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
    // If no award yet, still include a "slot" so hasContributorBonuses is correct
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

// ══════════════════════════════════════════════
// Tournament Leaderboard
// ══════════════════════════════════════════════

export const getTournamentLeaderboardFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tournamentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireTournamentParticipant(data.tournamentId);

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

// ══════════════════════════════════════════════
// Primary Scoring Basis setters
// ══════════════════════════════════════════════

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
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      columns: { tournamentId: true },
    });
    if (!round) throw new Error('Round not found');
    await requireCommissioner(round.tournamentId);

    const [updated] = await db
      .update(rounds)
      .set({
        primaryScoringBasis: data.basis ?? null,
        updatedAt: new Date(),
      })
      .where(eq(rounds.id, data.roundId))
      .returning({
        id: rounds.id,
        primaryScoringBasis: rounds.primaryScoringBasis,
      });

    return updated;
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
    await requireCommissioner(data.tournamentId);

    const [updated] = await db
      .update(tournaments)
      .set({
        primaryScoringBasis: data.basis ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, data.tournamentId))
      .returning({
        id: tournaments.id,
        primaryScoringBasis: tournaments.primaryScoringBasis,
      });

    return updated;
  });

// ══════════════════════════════════════════════
// Game Decisions (Wolf per-hole declarations)
// ══════════════════════════════════════════════

export const submitGameDecisionFn = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      competitionId: z.string().uuid(),
      roundId: z.string().uuid(),
      holeNumber: z.number().int().min(1).max(18),
      wolfPlayerId: z.string().uuid(),
      partnerPlayerId: z.string().uuid().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
      columns: { tournamentId: true, formatType: true },
    });
    if (!comp) throw new Error('Competition not found');
    if (comp.formatType !== 'wolf')
      throw new Error(
        'Game decisions are only supported for Wolf competitions',
      );

    // Any participant in the round's tournament can record a wolf decision
    await verifyTournamentMembership(user.id, comp.tournamentId);

    const [decision] = await db
      .insert(gameDecisions)
      .values({
        competitionId: data.competitionId,
        roundId: data.roundId,
        holeNumber: data.holeNumber,
        data: {
          wolfPlayerId: data.wolfPlayerId,
          partnerPlayerId: data.partnerPlayerId,
        },
        recordedByUserId: user.id,
      })
      .returning();

    return decision;
  });

export const getGameDecisionsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ competitionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    const comp = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.competitionId),
      columns: { tournamentId: true },
    });
    if (!comp) throw new Error('Competition not found');
    await verifyTournamentMembership(user.id, comp.tournamentId);

    // Fetch all decisions ordered newest first; deduplicate to latest per holeNumber
    const allDecisions = await db.query.gameDecisions.findMany({
      where: eq(gameDecisions.competitionId, data.competitionId),
      orderBy: [desc(gameDecisions.createdAt)],
    });

    // Latest per holeNumber wins
    const seen = new Set<number>();
    const latest = allDecisions.filter((d) => {
      if (seen.has(d.holeNumber)) return false;
      seen.add(d.holeNumber);
      return true;
    });

    return latest;
  });

// ══════════════════════════════════════════════
// Compute Standings (server-side)
//
// Loads all round data for a tournament, feeds it
// through the pure standings engine, returns the
// computed leaderboard.
// ══════════════════════════════════════════════

export const computeStandingsFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ standingId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Rate-limit: this is the most expensive endpoint
    if (!checkRateLimit(`standings:${user.id}`, 30, 60_000)) {
      throw new Error('Too many requests. Please slow down.');
    }

    // 1. Load the standing config
    const standing = await db.query.tournamentStandings.findFirst({
      where: eq(tournamentStandings.id, data.standingId),
    });
    if (!standing) throw new Error('Standing not found');

    // IDOR: verify the requesting user is a participant in this tournament
    await verifyTournamentMembership(user.id, standing.tournamentId);

    const aggregationConfig = aggregationConfigSchema.parse(
      standing.aggregationConfig,
    );

    // 2. Load tournament-level teams (fallback when rounds have no round_teams)
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

    // 3. Load all rounds with participants, scores, groups, and competitions
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

    // 4. Batch-load all score events for all rounds in one query
    const allRoundIds = tournamentRounds.map((r) => r.id);
    const allEvents =
      allRoundIds.length > 0
        ? await db.query.scoreEvents.findMany({
            where: inArray(scoreEvents.roundId, allRoundIds),
            orderBy: [desc(scoreEvents.createdAt)],
          })
        : [];

    // Group events by roundId
    const eventsByRound = new Map<string, (typeof allEvents)[number][]>();
    for (const event of allEvents) {
      const arr = eventsByRound.get(event.roundId) ?? [];
      arr.push(event);
      eventsByRound.set(event.roundId, arr);
    }

    // 5. Build RoundCompetitionData[] for the engine
    const roundDatas: RoundCompetitionData[] = [];
    const allContributorBonuses: ContributorBonusAward[] = [];

    for (const round of tournamentRounds) {
      // Resolve scores (latest event per participant+hole)
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
        name: g.name,
        memberParticipantIds: round.participants
          .filter((rp) => rp.roundGroupId === g.id)
          .map((rp) => rp.id),
      }));

      // Build teams from tournament-level teams (permanent path — round teams are retired)
      // Map tournamentParticipantId → roundParticipantId
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

      // Build CompetitionInput for each non-bonus competition
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

      // Collect contributor bonus awards
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

    // 6. Run the pure standings engine
    const result: StandingsResult = calculateStandings(
      aggregationConfig,
      roundDatas,
      standing.participantType as 'individual' | 'team',
      allContributorBonuses,
    );

    // 7. Return standings data with round info for column headers
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
