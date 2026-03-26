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
import { resolveLatestScores } from './server/score-events.server';
import type {
  CompetitionInput,
  CompetitionResult,
  GameDecisionData,
  GroupCompetitionResult,
  HoleData,
  ParticipantData,
  ResolvedScore,
  TeamData,
} from './domain/index';
import {
  calculateIndividualScoreboard,
  type IndividualScoreboardInput,
  type BonusAwardInput,
} from './domain/individual-scoreboard';
import { calculateGroupedResults } from './domain/index';
import {
  calculateTournamentLeaderboard,
  type TournamentLeaderboardRoundInput,
} from './domain/tournament-leaderboard';
import {
  FORMAT_TYPE_LABELS,
  isTeamFormat,
  type CompetitionConfig,
} from './competition-config';

type OutcomeCategory = 'individual' | 'team';

type CompetitionOutcomeSummary = {
  competitionId: string;
  competitionName: string;
  formatLabel: string;
  category: OutcomeCategory;
  headline: string;
  details: string[];
};

type TeamPointsEntry = {
  teamId: string;
  teamName: string;
  points: number;
};

type TeamLeaderboardRowSummary = {
  teamId: string;
  teamName: string;
  totalPoints: number;
  rank: number;
  roundPoints: Array<{
    roundId: string;
    roundName: string;
    points: number | null;
  }>;
};

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

function getGroupLabel(group: {
  groupNumber: number;
  groupName: string | null;
}) {
  return group.groupName?.trim() || `Group ${group.groupNumber}`;
}

function getLatestGameDecisions(
  decisions: Array<{
    holeNumber: number;
    data: Record<string, unknown>;
    createdAt: Date;
  }>,
): GameDecisionData[] {
  const latest = [...decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const seen = new Set<number>();

  return latest.flatMap((decision) => {
    if (seen.has(decision.holeNumber)) return [];
    seen.add(decision.holeNumber);

    return [
      {
        holeNumber: decision.holeNumber,
        data: {
          wolfPlayerId: String(decision.data.wolfPlayerId ?? ''),
          partnerPlayerId:
            typeof decision.data.partnerPlayerId === 'string'
              ? decision.data.partnerPlayerId
              : null,
          isBlindLoneWolf: decision.data.isBlindLoneWolf === true,
        },
      },
    ];
  });
}

function buildRoundTeams(
  participants: Array<{
    id: string;
    tournamentParticipant?: {
      teamMemberships?: Array<{
        team: { id: string; name: string };
      }>;
    } | null;
  }>,
): TeamData[] {
  const teamMap = new Map<
    string,
    { teamId: string; name: string; memberParticipantIds: string[] }
  >();

  for (const participant of participants) {
    for (const membership of participant.tournamentParticipant
      ?.teamMemberships ?? []) {
      const entry = teamMap.get(membership.team.id) ?? {
        teamId: membership.team.id,
        name: membership.team.name,
        memberParticipantIds: [],
      };

      if (!entry.memberParticipantIds.includes(participant.id)) {
        entry.memberParticipantIds.push(participant.id);
      }

      teamMap.set(membership.team.id, entry);
    }
  }

  return [...teamMap.values()].map((team) => ({
    ...team,
    tournamentTeamId: team.teamId,
  }));
}

function collectTeamPoints(
  result: CompetitionResult,
  teams: TeamData[],
): TeamPointsEntry[] {
  const totals = new Map<string, TeamPointsEntry>();

  const addPoints = (teamId: string, teamName: string, points: number) => {
    const existing = totals.get(teamId) ?? { teamId, teamName, points: 0 };
    existing.points += points;
    totals.set(teamId, existing);
  };

  const playerTeamMap = new Map<string, { teamId: string; teamName: string }>();
  for (const team of teams) {
    for (const memberId of team.memberParticipantIds) {
      playerTeamMap.set(memberId, { teamId: team.teamId, teamName: team.name });
    }
  }

  switch (result.type) {
    case 'match_play':
      for (const match of result.result.matches) {
        const teamA = playerTeamMap.get(match.playerA.roundParticipantId);
        const teamB = playerTeamMap.get(match.playerB.roundParticipantId);
        if (teamA) addPoints(teamA.teamId, teamA.teamName, match.pointsA);
        if (teamB) addPoints(teamB.teamId, teamB.teamName, match.pointsB);
      }
      break;
    case 'best_ball':
    case 'hi_lo':
      for (const match of result.result.matches) {
        addPoints(match.teamA.teamId, match.teamA.name, match.pointsA);
        addPoints(match.teamB.teamId, match.teamB.name, match.pointsB);
      }
      break;
    case 'rumble':
      for (const teamResult of result.result.teamResults) {
        addPoints(teamResult.teamId, teamResult.teamName, teamResult.points);
      }
      break;
    default:
      break;
  }

  return [...totals.values()];
}

function summariseSingleResult(
  result: CompetitionResult,
  context?: { groupNumber: number; groupName: string | null },
): { headline: string; detail: string } | null {
  const prefix = context ? `${getGroupLabel(context)}: ` : '';

  switch (result.type) {
    case 'match_play': {
      const details = result.result.matches.map(
        (match) => `${prefix}${match.resultText}`,
      );
      if (details.length === 0) return null;
      return {
        headline:
          details.length === 1
            ? details[0].replace(prefix, '')
            : `${details.length} matches completed`,
        detail: details.join(' | '),
      };
    }
    case 'best_ball':
    case 'hi_lo': {
      const details = result.result.matches.map(
        (match) => `${prefix}${match.resultText}`,
      );
      if (details.length === 0) return null;
      return {
        headline:
          details.length === 1
            ? details[0].replace(prefix, '')
            : `${details.length} team matches scored`,
        detail: details.join(' | '),
      };
    }
    case 'rumble':
      return {
        headline: result.result.resultText,
        detail: `${prefix}${result.result.resultText}`,
      };
    case 'wolf': {
      const leaders = result.result.leaderboard.filter((row) => row.rank === 1);
      if (leaders.length === 0) return null;
      const names = joinNames(leaders.map((row) => row.displayName));
      const points = leaders[0]?.totalPoints ?? 0;
      return {
        headline: `${names} on ${points} wolf pts`,
        detail: `${prefix}${names} on ${points} wolf pts`,
      };
    }
    case 'six_point':
    case 'chair': {
      const leaders = result.result.leaderboard.filter((row) => row.rank === 1);
      if (leaders.length === 0) return null;
      const names = joinNames(leaders.map((row) => row.displayName));
      const points = leaders[0]?.totalPoints ?? 0;
      return {
        headline: `${names} on ${points} pts`,
        detail: `${prefix}${names} on ${points} pts`,
      };
    }
    case 'nearest_pin':
    case 'longest_drive':
      return null;
    default:
      return null;
  }
}

function summariseCompetition(
  competition: {
    id: string;
    name: string;
    formatType: CompetitionConfig['formatType'];
  },
  groupedResults:
    | { scope: 'all'; result: CompetitionResult }
    | { scope: 'within_group'; results: GroupCompetitionResult[] },
  teams: TeamData[],
): {
  summary: CompetitionOutcomeSummary | null;
  teamPoints: TeamPointsEntry[];
} {
  const category: OutcomeCategory =
    isTeamFormat(competition.formatType) ||
    (competition.formatType === 'match_play' && teams.length > 0)
      ? 'team'
      : 'individual';

  if (groupedResults.scope === 'all') {
    const summaryBits = summariseSingleResult(groupedResults.result);
    return {
      summary: summaryBits
        ? {
            competitionId: competition.id,
            competitionName: competition.name,
            formatLabel: FORMAT_TYPE_LABELS[competition.formatType],
            category,
            headline: summaryBits.headline,
            details: [summaryBits.detail],
          }
        : null,
      teamPoints:
        category === 'team'
          ? collectTeamPoints(groupedResults.result, teams)
          : [],
    };
  }

  const details = groupedResults.results
    .map((groupResult) =>
      summariseSingleResult(groupResult.result, {
        groupNumber: groupResult.groupNumber,
        groupName: groupResult.groupName,
      }),
    )
    .filter((value): value is NonNullable<typeof value> => value !== null);

  const teamPointsMap = new Map<string, TeamPointsEntry>();
  if (category === 'team') {
    for (const groupResult of groupedResults.results) {
      for (const entry of collectTeamPoints(groupResult.result, teams)) {
        const existing = teamPointsMap.get(entry.teamId) ?? {
          ...entry,
          points: 0,
        };
        existing.points += entry.points;
        teamPointsMap.set(entry.teamId, existing);
      }
    }
  }

  return {
    summary:
      details.length > 0
        ? {
            competitionId: competition.id,
            competitionName: competition.name,
            formatLabel: FORMAT_TYPE_LABELS[competition.formatType],
            category,
            headline:
              details.length === 1
                ? details[0].headline
                : `${details.length} grouped results`,
            details: details.map((detail) => detail.detail),
          }
        : null,
    teamPoints: [...teamPointsMap.values()],
  };
}

function rankTeamRows(rows: TeamLeaderboardRowSummary[]) {
  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName),
  );

  let rank = 1;
  for (let index = 0; index < rows.length; index++) {
    if (index > 0 && rows[index].totalPoints !== rows[index - 1].totalPoints) {
      rank = index + 1;
    }
    rows[index].rank = rank;
  }
}

type RoundCompetitionSource = {
  id: string;
  participants: Array<{
    id: string;
    person: { id: string; displayName: string };
    handicapOverride: string | null;
    handicapSnapshot: string;
    roundGroupId: string | null;
    tournamentParticipant: {
      handicapOverride: string | null;
      teamMemberships: Array<{
        team: { id: string; name: string };
      }>;
    } | null;
  }>;
  groups: Array<{
    id: string;
    groupNumber: number;
    name: string | null;
  }>;
  course: {
    holes: Array<{
      holeNumber: number;
      par: number;
      strokeIndex: number;
    }>;
  };
  competitions: Array<{
    id: string;
    name: string;
    formatType: string;
    configJson: Record<string, unknown> | null;
    groupScope: 'all' | 'within_group' | null;
    gameDecisions: Array<{
      holeNumber: number;
      data: Record<string, unknown>;
      createdAt: Date;
    }>;
  }>;
};

function buildRoundCompetitionInput(args: {
  round: RoundCompetitionSource;
  resolvedScores: ResolvedScore[];
}) {
  const { round, resolvedScores } = args;

  const holes: HoleData[] = round.course.holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par,
    strokeIndex: hole.strokeIndex,
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

  const groups = (round.groups ?? []).map((group) => ({
    roundGroupId: group.id,
    groupNumber: group.groupNumber,
    name: group.name ?? null,
    memberParticipantIds: round.participants
      .filter((participant) => participant.roundGroupId === group.id)
      .map((participant) => participant.id),
  }));

  const teams = buildRoundTeams(round.participants);

  const competitionInputs: CompetitionInput[] = round.competitions
    .filter(
      (competition) =>
        competition.formatType !== 'nearest_pin' &&
        competition.formatType !== 'longest_drive',
    )
    .map((competition) => ({
      competition: {
        id: competition.id,
        name: competition.name,
        config: {
          formatType: competition.formatType as CompetitionConfig['formatType'],
          config: competition.configJson ?? {},
        } as CompetitionConfig,
        groupScope: (competition.groupScope ?? 'all') as 'all' | 'within_group',
      },
      holes,
      participants,
      scores: resolvedScores,
      teams,
      groups,
      gameDecisions:
        competition.formatType === 'wolf'
          ? getLatestGameDecisions(competition.gameDecisions)
          : [],
    }));

  return { holes, participants, teams, competitionInputs };
}

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
      columns: { primaryScoringBasis: true, name: true },
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
        groups: {
          orderBy: (g, { asc }) => [asc(g.groupNumber)],
        },
        participants: {
          with: {
            person: true,
            tournamentParticipant: {
              with: {
                teamMemberships: {
                  with: {
                    team: true,
                  },
                },
              },
            },
          },
        },
        competitions: {
          with: {
            bonusAwards: true,
            gameDecisions: true,
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

    const leaderboardRounds: TournamentLeaderboardRoundInput[] = [];
    const roundOutcomeSections: Array<{
      roundId: string;
      roundName: string;
      isFinalised: boolean;
      competitions: CompetitionOutcomeSummary[];
    }> = [];
    const teamRowsMap = new Map<string, TeamLeaderboardRowSummary>();

    for (const round of tournamentRounds) {
      const events = eventsByRound.get(round.id) ?? [];
      const resolvedScores: ResolvedScore[] = resolveLatestScores(events).map(
        (e) => ({
          roundParticipantId: e.roundParticipantId,
          holeNumber: e.holeNumber,
          strokes: e.strokes,
        }),
      );

      const { holes, participants, teams, competitionInputs } =
        buildRoundCompetitionInput({
          round,
          resolvedScores,
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

      const competitionSummaries = competitionInputs
        .map((input) => {
          const { summary, teamPoints } = summariseCompetition(
            {
              id: input.competition.id,
              name: input.competition.name,
              formatType: input.competition.config.formatType,
            },
            calculateGroupedResults(input),
            teams,
          );

          if (teamPoints.length > 0 && round.status === 'finalized') {
            for (const teamPoint of teamPoints) {
              const existing = teamRowsMap.get(teamPoint.teamId) ?? {
                teamId: teamPoint.teamId,
                teamName: teamPoint.teamName,
                totalPoints: 0,
                rank: 0,
                roundPoints: [],
              };

              existing.totalPoints += teamPoint.points;
              const roundEntry = existing.roundPoints.find(
                (entry) => entry.roundId === round.id,
              );
              if (roundEntry) {
                roundEntry.points = (roundEntry.points ?? 0) + teamPoint.points;
              } else {
                existing.roundPoints.push({
                  roundId: round.id,
                  roundName: `Round ${round.roundNumber}`,
                  points: teamPoint.points,
                });
              }
              teamRowsMap.set(teamPoint.teamId, existing);
            }
          }

          return summary;
        })
        .filter(
          (summary): summary is CompetitionOutcomeSummary => summary !== null,
        );

      if (competitionSummaries.length > 0) {
        roundOutcomeSections.push({
          roundId: round.id,
          roundName: `Round ${round.roundNumber} — ${round.course.name}`,
          isFinalised: round.status === 'finalized',
          competitions: competitionSummaries,
        });
      }
    }

    const leaderboardResult = calculateTournamentLeaderboard({
      rounds: leaderboardRounds,
    });

    const teamLeaderboard = [...teamRowsMap.values()];
    for (const teamRow of teamLeaderboard) {
      for (const round of leaderboardRounds) {
        if (
          !teamRow.roundPoints.some((entry) => entry.roundId === round.roundId)
        ) {
          teamRow.roundPoints.push({
            roundId: round.roundId,
            roundName: round.roundName,
            points: null,
          });
        }
      }
      teamRow.roundPoints.sort(
        (a, b) =>
          leaderboardRounds.findIndex((round) => round.roundId === a.roundId) -
          leaderboardRounds.findIndex((round) => round.roundId === b.roundId),
      );
    }
    rankTeamRows(teamLeaderboard);

    return {
      tournamentId: data.tournamentId,
      tournamentName: tournament.name,
      primaryScoringBasis: tournament.primaryScoringBasis ?? null,
      rounds: leaderboardRounds.map((r) => ({
        roundId: r.roundId,
        roundName: r.roundName,
        isFinalised: r.isFinalised,
        totalHoles: r.totalHoles,
      })),
      roundOutcomes: roundOutcomeSections,
      teamLeaderboard,
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
