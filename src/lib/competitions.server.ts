import { createServerFn } from '@tanstack/react-start';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { competitions, bonusAwards, rounds } from '@/db/schema';
import { requireAuth, requireCommissioner } from './auth.helpers';
import { competitionConfigSchema } from './competitions';
import type {
  CreateCompetitionInput,
  UpdateCompetitionInput,
  AwardBonusInput,
} from './validators';

// ──────────────────────────────────────────────
// List competitions for a tournament
// ──────────────────────────────────────────────

export const getCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { tournamentId: string }) => data)
  .handler(async ({ data }) => {
    return db.query.competitions.findMany({
      where: eq(competitions.tournamentId, data.tournamentId),
      orderBy: (competitions, { asc }) => [asc(competitions.createdAt)],
    });
  });

// ──────────────────────────────────────────────
// List competitions for a specific round (includes tournament-wide)
// ──────────────────────────────────────────────

export const getRoundCompetitionsFn = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { tournamentId: string; roundId: string }) => data,
  )
  .handler(async ({ data }) => {
    const allComps = await db.query.competitions.findMany({
      where: eq(competitions.tournamentId, data.tournamentId),
      with: {
        bonusAwards: {
          with: {
            roundParticipant: {
              with: {
                person: true,
              },
            },
          },
        },
      },
    });

    // Return: round-scoped for this round + tournament-wide
    return allComps.filter(
      (c) =>
        c.scope === 'tournament' || c.roundId === data.roundId,
    );
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
              with: {
                person: true,
              },
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

    // If round-scoped, verify the round belongs to this tournament
    if (data.roundId) {
      const round = await db.query.rounds.findFirst({
        where: and(
          eq(rounds.id, data.roundId),
          eq(rounds.tournamentId, data.tournamentId),
        ),
      });
      if (!round) throw new Error('Round not found in this tournament');
    }

    const [comp] = await db
      .insert(competitions)
      .values({
        tournamentId: data.tournamentId,
        name: data.name,
        scope: data.scope,
        formatType: parsed.formatType,
        configJson: parsed.config,
        roundId: data.roundId ?? null,
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
    // Look up the competition to get the tournament ID
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

    await db.delete(competitions).where(eq(competitions.id, data.competitionId));
    return { success: true };
  });

// ──────────────────────────────────────────────
// Award a bonus (NTP/LD) — commissioner or marker
// ──────────────────────────────────────────────

export const awardBonusFn = createServerFn({ method: 'POST' })
  .inputValidator((data: AwardBonusInput) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();

    // Verify the competition exists and is a bonus type
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

    // Delete any existing award for this competition (only one winner)
    await db
      .delete(bonusAwards)
      .where(eq(bonusAwards.competitionId, data.competitionId));

    // Insert the new award
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
