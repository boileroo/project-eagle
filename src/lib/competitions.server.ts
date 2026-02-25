import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { competitions, bonusAwards, rounds } from '@/db/schema';
import {
  requireAuth,
  requireCommissioner,
  requireCommissionerOrMarker,
  requireTournamentParticipant,
  verifyTournamentMembership,
} from './server/auth.helpers.server';
import { competitionConfigSchema } from './competitions';
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  awardBonusSchema,
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

    const parsed = competitionConfigSchema.parse(data.competitionConfig);

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
