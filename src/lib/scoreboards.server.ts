import { createServerFn } from '@tanstack/react-start';
import { eq, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { rounds, scores, tournaments } from '@/db/schema';
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
  GAME_FORMAT_LABELS,
  isTeamFormat,
  type GameConfig,
} from './game-config';
import { collectTeamPoints, type TeamPointsEntry } from './domain/team-points';

type OutcomeCategory = 'individual' | 'team';

type CompetitionOutcomeSummary = {
  competitionId: string;
  competitionName: string;
  formatLabel: string;
  category: OutcomeCategory;
  headline: string;
  details: string[];
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
    groupId: string | null;
    data: Record<string, unknown>;
    createdAt: Date;
  }>,
): GameDecisionData[] {
  const latest = [...decisions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const seen = new Map<string, Set<number>>();

  return latest.flatMap((decision) => {
    const groupKey = decision.groupId ?? '__null__';
    if (!seen.has(groupKey)) seen.set(groupKey, new Set());
    const seenHoles = seen.get(groupKey)!;
    if (seenHoles.has(decision.holeNumber)) return [];
    seenHoles.add(decision.holeNumber);

    return [
      {
        holeNumber: decision.holeNumber,
        roundGroupId: decision.groupId,
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
  players: Array<{
    id: string;
    player?: {
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

  for (const rp of players) {
    for (const membership of rp.player?.teamMemberships ?? []) {
      const entry = teamMap.get(membership.team.id) ?? {
        teamId: membership.team.id,
        name: membership.team.name,
        memberParticipantIds: [],
      };

      if (!entry.memberParticipantIds.includes(rp.id)) {
        entry.memberParticipantIds.push(rp.id);
      }

      teamMap.set(membership.team.id, entry);
    }
  }

  return [...teamMap.values()].map((team) => ({
    ...team,
    tournamentTeamId: team.teamId,
  }));
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
    case 'rumble': {
      const winners = result.result.teamResults.filter((t) => t.winner);
      if (winners.length === 0) return null;
      const names = joinNames(winners.map((t) => t.teamName));
      const points = winners[0]?.points ?? 0;
      return {
        headline: `${names} on ${points} pts`,
        detail: `${prefix}${names} on ${points} pts`,
      };
    }
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

function combineCompetitionSummaries(
  formatType: string,
  inputs: CompetitionInput[],
  teams: TeamData[],
): {
  summary: CompetitionOutcomeSummary;
  teamPoints: TeamPointsEntry[];
} | null {
  const ft = formatType as GameConfig['formatType'];
  const category: OutcomeCategory =
    isTeamFormat(ft) || (ft === 'match_play' && teams.length > 0)
      ? 'team'
      : 'individual';

  const allDetails: string[] = [];
  const teamPointsMap = new Map<string, TeamPointsEntry>();
  let groupCount = 0;
  let combinedHeadline: string | null = null;

  for (const input of inputs) {
    const groupedResults = calculateGroupedResults(input);

    if (groupedResults.scope === 'all') {
      groupCount++;
      const summaryBits = summariseSingleResult(groupedResults.result);
      if (summaryBits) {
        allDetails.push(summaryBits.detail);
      }
      if (category === 'team') {
        for (const entry of collectTeamPoints(groupedResults.result, teams)) {
          const existing = teamPointsMap.get(entry.teamId) ?? {
            ...entry,
            points: 0,
          };
          existing.points += entry.points;
          teamPointsMap.set(entry.teamId, existing);
        }
      }
    } else {
      groupCount += groupedResults.results.length;
      for (const groupResult of groupedResults.results) {
        const summaryBits = summariseSingleResult(groupResult.result, {
          groupNumber: groupResult.groupNumber,
          groupName: groupResult.groupName,
        });
        if (summaryBits) {
          allDetails.push(summaryBits.detail);
        }
      }
      if (groupedResults.combined && groupedResults.results.length > 1) {
        const combinedBits = summariseSingleResult(groupedResults.combined);
        if (combinedBits) {
          allDetails.push(`Combined: ${combinedBits.headline}`);
          combinedHeadline = combinedBits.headline;
        }
      }
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
    }
  }

  if (allDetails.length === 0) {
    return null;
  }

  const formatLabel =
    GAME_FORMAT_LABELS[formatType as keyof typeof GAME_FORMAT_LABELS] ??
    formatType;
  const competitionName =
    inputs.length === 1
      ? inputs[0].competition.name
      : `${formatLabel} (${inputs.length} groups)`;

  const headline =
    allDetails.length === 1
      ? allDetails[0]
      : combinedHeadline
        ? `${groupCount} groups — ${combinedHeadline}`
        : `${groupCount} groups completed`;

  return {
    summary: {
      competitionId: inputs.map((i) => i.competition.id).join('+'),
      competitionName,
      formatLabel,
      category,
      headline,
      details: allDetails,
    },
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
  players: Array<{
    id: string;
    person: { id: string; displayName: string };
    handicapOverride: string | null;
    handicapSnapshot: string;
    groupId: string | null;
    player: {
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
  games: Array<{
    id: string;
    name: string;
    format: string;
    config: Record<string, unknown> | null;
    groupId: string | null;
    decisions: Array<{
      holeNumber: number;
      groupId: string | null;
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

  const participants: ParticipantData[] = round.players.map((rp) => {
    const effectiveHC = resolveEffectiveHandicap({
      handicapOverride: rp.handicapOverride,
      handicapSnapshot: rp.handicapSnapshot,
      tournamentParticipant: rp.player
        ? { handicapOverride: rp.player.handicapOverride }
        : null,
    });

    return {
      roundParticipantId: rp.id,
      personId: rp.person.id,
      displayName: rp.person.displayName,
      effectiveHandicap: effectiveHC,
      playingHandicap: getPlayingHandicap(effectiveHC),
      roundGroupId: rp.groupId ?? null,
    };
  });

  const groups = (round.groups ?? []).map((group) => ({
    roundGroupId: group.id,
    groupNumber: group.groupNumber,
    name: group.name ?? null,
    memberParticipantIds: round.players
      .filter((rp) => rp.groupId === group.id)
      .map((rp) => rp.id),
  }));

  const teams = buildRoundTeams(round.players);

  const competitionInputs: CompetitionInput[] = round.games
    .filter(
      (game) =>
        game.format !== 'nearest_pin' && game.format !== 'longest_drive',
    )
    .map((game) => ({
      competition: {
        id: game.id,
        name: game.name,
        config: {
          formatType: game.format as GameConfig['formatType'],
          config: game.config ?? {},
        } as GameConfig,
        groupScope: game.groupId != null ? 'within_group' : 'all',
        roundGroupId: game.groupId ?? null,
      },
      holes,
      participants,
      scores: resolvedScores,
      teams,
      groups,
      gameDecisions:
        game.format === 'wolf' ? getLatestGameDecisions(game.decisions) : [],
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
      players: {
        with: {
          person: true,
          player: true,
        },
      },
      sideGames: true,
    },
  });
  if (!round) throw new Error('Round not found');

  const events = await db.query.scores.findMany({
    where: eq(scores.roundId, roundId),
    orderBy: [desc(scores.createdAt)],
  });

  const resolvedScores: ResolvedScore[] = resolveLatestScores(events).map(
    (e) => ({
      roundParticipantId: e.roundPlayerId,
      holeNumber: e.holeNumber,
      strokes: e.strokes,
    }),
  );

  const holes: HoleData[] = round.course.holes.map((h) => ({
    holeNumber: h.holeNumber,
    par: h.par,
    strokeIndex: h.strokeIndex,
  }));

  const participants: ParticipantData[] = round.players.map((rp) => {
    const effectiveHC = resolveEffectiveHandicap({
      handicapOverride: rp.handicapOverride,
      handicapSnapshot: rp.handicapSnapshot,
      tournamentParticipant: rp.player
        ? { handicapOverride: rp.player.handicapOverride }
        : null,
    });
    return {
      roundParticipantId: rp.id,
      personId: rp.person.id,
      displayName: rp.person.displayName,
      effectiveHandicap: effectiveHC,
      playingHandicap: getPlayingHandicap(effectiveHC),
      roundGroupId: rp.groupId ?? null,
    };
  });

  const bonusAwardInputs: BonusAwardInput[] = [];
  for (const sg of round.sideGames) {
    const formatType = sg.format as 'nearest_pin' | 'longest_drive';
    const bonusMode =
      sg.bonusMode === 'standalone' ? 'standalone' : 'contributor';
    const bonusPoints = sg.bonusPoints ?? 1;
    const holeNumber = sg.holeNumber ?? 0;
    bonusAwardInputs.push({
      competitionId: sg.id,
      competitionName: sg.name,
      formatType,
      bonusMode,
      bonusPoints,
      holeNumber,
      roundParticipantId: sg.winnerId ?? null,
    });
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

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, roundForAuth.tournamentId),
      columns: { scoringBasis: true },
    });

    return {
      roundId: round.id,
      roundNumber: round.roundNumber,
      courseName: round.course.name,
      totalHoles: round.course.holes.length,
      scoringBasis: tournament?.scoringBasis ?? null,
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
      columns: { scoringBasis: true, name: true },
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
        players: {
          with: {
            person: true,
            player: {
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
        games: {
          with: {
            decisions: true,
          },
        },
        sideGames: true,
      },
    });

    const allRoundIds = tournamentRounds.map((r) => r.id);
    const allEvents =
      allRoundIds.length > 0
        ? await db.query.scores.findMany({
            where: inArray(scores.roundId, allRoundIds),
            orderBy: [desc(scores.createdAt)],
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
          roundParticipantId: e.roundPlayerId,
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
      for (const sg of round.sideGames) {
        const formatType = sg.format as 'nearest_pin' | 'longest_drive';
        const bonusMode =
          sg.bonusMode === 'standalone' ? 'standalone' : 'contributor';
        const bonusPoints = sg.bonusPoints ?? 1;
        const holeNumber = sg.holeNumber ?? 0;
        bonusAwardInputs.push({
          competitionId: sg.id,
          competitionName: sg.name,
          formatType,
          bonusMode,
          bonusPoints,
          holeNumber,
          roundParticipantId: sg.winnerId ?? null,
        });
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

      const competitionInputsByFormat = new Map<string, CompetitionInput[]>();
      for (const input of competitionInputs) {
        const formatType = input.competition.config.formatType;
        const existing = competitionInputsByFormat.get(formatType) ?? [];
        existing.push(input);
        competitionInputsByFormat.set(formatType, existing);
      }

      const competitionSummaries: CompetitionOutcomeSummary[] = [];
      const allTeamPoints: TeamPointsEntry[] = [];

      for (const [formatType, inputs] of competitionInputsByFormat) {
        const combinedSummary = combineCompetitionSummaries(
          formatType,
          inputs,
          teams,
        );

        if (combinedSummary) {
          competitionSummaries.push(combinedSummary.summary);
          allTeamPoints.push(...combinedSummary.teamPoints);
        }
      }

      for (const teamPoint of allTeamPoints) {
        if (round.status !== 'finalized') continue;
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
      scoringBasis: tournament.scoringBasis ?? null,
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

const scoringBasisSchema = z
  .enum(['gross_strokes', 'net_strokes', 'stableford', 'total'])
  .nullable();

export const setTournamentPrimaryScoringBasisFn = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z.object({
      tournamentId: z.string().uuid(),
      basis: scoringBasisSchema,
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    await verifyTournamentMembership(user.id, data.tournamentId);

    await db
      .update(tournaments)
      .set({ scoringBasis: data.basis })
      .where(eq(tournaments.id, data.tournamentId));

    return { success: true };
  });
