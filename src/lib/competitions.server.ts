import { createServerFn } from '@tanstack/react-start';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  competitions,
  bonusAwards,
  rounds,
  scoreEvents,
  tournamentStandings,
  tournamentTeams,
} from '@/db/schema';
import { requireAuth, requireCommissioner } from './auth.helpers';
import { competitionConfigSchema, aggregationConfigSchema, isBonusFormat } from './competitions';
import type { CompetitionConfig } from './competitions';
import { resolveEffectiveHandicap, getPlayingHandicap } from './handicaps';
import { calculateStandings } from './domain/standings';
import type { RoundCompetitionData, ContributorBonusAward, StandingsResult } from './domain/standings';
import type { CompetitionInput, HoleData, ParticipantData, ResolvedScore, GroupData, TeamData } from './domain/index';
import type {
  CreateCompetitionInput,
  UpdateCompetitionInput,
  AwardBonusInput,
  CreateTournamentStandingInput,
  UpdateTournamentStandingInput,
} from './validators';

// ──────────────────────────────────────────────
// List all competitions for a tournament
// ──────────────────────────────────────────────

export const getCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { tournamentId: string }) => data)
  .handler(async ({ data }) => {
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
  .inputValidator((data: { roundId: string }) => data)
  .handler(async ({ data }) => {
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
  .inputValidator((data: { competitionId: string }) => data)
  .handler(async ({ data }) => {
    return db.query.competitions.findFirst({
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
  });

// ──────────────────────────────────────────────
// Create a competition (commissioner only)
// ──────────────────────────────────────────────

export const createCompetitionFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateCompetitionInput) => data)
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

    // Enforce per-round competition limits:
    // max 1 team comp + max 1 individual comp (bonuses unlimited)
    if (!isBonusFormat(parsed.formatType)) {
      const existingComps = await db.query.competitions.findMany({
        where: eq(competitions.roundId, data.roundId),
      });
      const sameTypeComps = existingComps.filter(
        (c) => c.participantType === data.participantType && !isBonusFormat(c.formatType as any),
      );
      if (sameTypeComps.length > 0) {
        const label = data.participantType === 'team' ? 'team' : 'individual';
        throw new Error(
          `This round already has a ${label} competition. Each round allows at most one team and one individual competition.`,
        );
      }
    }

    const [comp] = await db
      .insert(competitions)
      .values({
        tournamentId: data.tournamentId,
        roundId: data.roundId,
        name: data.name,
        participantType: data.participantType,
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
  .inputValidator((data: UpdateCompetitionInput) => data)
  .handler(async ({ data }) => {
    const existing = await db.query.competitions.findFirst({
      where: eq(competitions.id, data.id),
    });
    if (!existing) throw new Error('Competition not found');

    await requireCommissioner(existing.tournamentId);

    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
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
  .inputValidator((data: { competitionId: string }) => data)
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
  .inputValidator((data: AwardBonusInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

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
  .inputValidator((data: { competitionId: string }) => data)
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
  .inputValidator((data: { tournamentId: string }) => data)
  .handler(async ({ data }) => {
    return db.query.tournamentStandings.findMany({
      where: eq(tournamentStandings.tournamentId, data.tournamentId),
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    });
  });

// ──────────────────────────────────────────────
// Create a tournament standing (commissioner only)
// ──────────────────────────────────────────────

export const createTournamentStandingFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateTournamentStandingInput) => data)
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
  .inputValidator((data: UpdateTournamentStandingInput) => data)
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
  .inputValidator((data: { standingId: string }) => data)
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
// Compute Standings (server-side)
//
// Loads all round data for a tournament, feeds it
// through the pure standings engine, returns the
// computed leaderboard.
// ══════════════════════════════════════════════

export const computeStandingsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { standingId: string }) => data)
  .handler(async ({ data }) => {
    // 1. Load the standing config
    const standing = await db.query.tournamentStandings.findFirst({
      where: eq(tournamentStandings.id, data.standingId),
    });
    if (!standing) throw new Error('Standing not found');

    const aggregationConfig = aggregationConfigSchema.parse(
      standing.aggregationConfig,
    );

    // 2. Load tournament-level teams (fallback when rounds have no round_teams)
    let tTeams: { id: string; name: string; members: { participantId: string }[] }[] = [];
    if (standing.participantType === 'team') {
      tTeams = await db.query.tournamentTeams.findMany({
        where: eq(tournamentTeams.tournamentId, standing.tournamentId),
        columns: { id: true, name: true },
        with: { members: { columns: { participantId: true } } },
      });
    }

    // 3. Load all rounds with participants, scores, groups, teams, competitions
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
        teams: {
          with: {
            members: true,
          },
        },
        competitions: {
          with: {
            bonusAwards: true,
          },
        },
      },
    });

    // 4. Build RoundCompetitionData[] for the engine
    const roundDatas: RoundCompetitionData[] = [];
    const allContributorBonuses: ContributorBonusAward[] = [];

    for (const round of tournamentRounds) {
      // Load scores for this round
      const events = await db.query.scoreEvents.findMany({
        where: eq(scoreEvents.roundId, round.id),
        orderBy: [desc(scoreEvents.createdAt)],
      });

      // Resolve scores (latest event per participant+hole)
      const resolvedScores: ResolvedScore[] = [];
      const seen = new Set<string>();
      for (const event of events) {
        const key = `${event.roundParticipantId}:${event.holeNumber}`;
        if (seen.has(key)) continue;
        seen.add(key);
        resolvedScores.push({
          roundParticipantId: event.roundParticipantId,
          holeNumber: event.holeNumber,
          strokes: event.strokes,
        });
      }

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

      let teams: TeamData[];
      if (round.teams.length > 0) {
        teams = round.teams.map((t) => ({
          roundTeamId: t.id,
          name: t.name,
          tournamentTeamId: t.tournamentTeamId,
          memberParticipantIds: t.members.map((m) => m.roundParticipantId),
        }));
      } else {
        // Fallback: build teams from tournament-level teams
        // Map tournamentParticipantId → roundParticipantId
        const tpToRp = new Map<string, string>();
        for (const rp of round.participants) {
          if (rp.tournamentParticipantId) {
            tpToRp.set(rp.tournamentParticipantId, rp.id);
          }
        }
        teams = tTeams.map((tt) => ({
          roundTeamId: tt.id, // use tournament team id as key
          name: tt.name,
          tournamentTeamId: tt.id,
          memberParticipantIds: tt.members
            .map((m) => tpToRp.get(m.participantId))
            .filter((id): id is string => id != null),
        }));
      }

      // Build CompetitionInput for each non-bonus competition
      const competitionInputs: CompetitionInput[] = round.competitions
        .filter((c) => !isBonusFormat(c.formatType as CompetitionConfig['formatType']))
        .map((c) => ({
          competition: {
            id: c.id,
            name: c.name,
            config: {
              formatType: c.formatType,
              config: (c.configJson ?? {}),
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
        if (!isBonusFormat(comp.formatType as CompetitionConfig['formatType'])) continue;
        const bonusConfig = comp.configJson as { bonusMode?: string; bonusPoints?: number } | null;
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

    // 5. Run the pure standings engine
    const result: StandingsResult = calculateStandings(
      aggregationConfig,
      roundDatas,
      standing.participantType as 'individual' | 'team',
      allContributorBonuses,
    );

    // 6. Return standings data with round info for column headers
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
