import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import {
  competitions,
  bonusAwards,
  rounds,
  tournamentStandings,
} from '@/db/schema';
import { requireAuth, requireCommissioner } from './auth.helpers';
import { competitionConfigSchema, aggregationConfigSchema } from './competitions';
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

    const [comp] = await db
      .insert(competitions)
      .values({
        tournamentId: data.tournamentId,
        roundId: data.roundId,
        name: data.name,
        participantType: data.participantType,
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
