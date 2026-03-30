import type { CompetitionConfig } from '../competitions';
import { isBonusFormat, isTeamFormat } from '../competition-config';
import { calculateMatchPlay, type MatchPlayResult } from './match-play';
import { calculateBestBall, type BestBallResult } from './best-ball';
import { calculateRumble, type RumbleResult } from './rumble';
import { calculateHiLo, type HiLoResult } from './hi-lo';
import { calculateWolf, type WolfResult } from './wolf';
import { calculateSixPoint, type SixPointResult } from './six-point';
import { calculateChair, type ChairResult } from './chair';
import { assignRanks as _assignRanks } from './rank';

/** Assigns tied-aware ranks to a sorted list of items. */
export { assignRanks } from './rank';

/** A single hole on the course with par and stroke index. */
export interface HoleData {
  holeNumber: number;
  par: number;
  strokeIndex: number;
}

/** A round participant with pre-resolved handicap data. */
export interface ParticipantData {
  roundParticipantId: string;
  personId: string;
  displayName: string;
  /** Effective handicap — already resolved from override cascade */
  effectiveHandicap: number;
  /** Integer playing handicap (strokes received) */
  playingHandicap: number;
  /** Group this participant belongs to (nullable) */
  roundGroupId: string | null;
}

/** A playing group within a round. */
export interface GroupData {
  roundGroupId: string;
  groupNumber: number;
  name: string | null;
  memberParticipantIds: string[];
}

/** A team (either ad-hoc round team or tournament-level team). */
export interface TeamData {
  teamId: string;
  name: string;
  tournamentTeamId: string | null;
  memberParticipantIds: string[];
}

/** Resolved score: latest event per (participantId, holeNumber). */
export interface ResolvedScore {
  roundParticipantId: string;
  holeNumber: number;
  strokes: number;
}

/** Wolf per-hole game decision (latest per holeNumber wins). */
export interface GameDecisionData {
  holeNumber: number;
  /** The group this decision belongs to (null for unscoped decisions) */
  roundGroupId: string | null;
  data: {
    wolfPlayerId: string;
    partnerPlayerId: string | null;
    /** True when the wolf declared solo before seeing any tee shots */
    isBlindLoneWolf?: boolean;
  };
}

/** All data needed by a competition engine to produce results. */
export interface CompetitionInput {
  competition: {
    id: string;
    name: string;
    config: CompetitionConfig;
    groupScope: 'all' | 'within_group';
    /** When set, restricts within_group processing to this specific group */
    roundGroupId?: string | null;
  };
  holes: HoleData[];
  participants: ParticipantData[];
  scores: ResolvedScore[];
  teams?: TeamData[];
  groups?: GroupData[];
  /** Wolf only: per-hole game decisions (latest per holeNumber) */
  gameDecisions?: GameDecisionData[];
}

/** Discriminated union of all competition engine outputs. */
export type CompetitionResult =
  | { type: 'match_play'; result: MatchPlayResult }
  | { type: 'best_ball'; result: BestBallResult }
  | { type: 'nearest_pin'; result: null }
  | { type: 'longest_drive'; result: null }
  | { type: 'rumble'; result: RumbleResult }
  | { type: 'hi_lo'; result: HiLoResult }
  | { type: 'wolf'; result: WolfResult }
  | { type: 'six_point'; result: SixPointResult }
  | { type: 'chair'; result: ChairResult };

/** A single group's competition result with group metadata. */
export interface GroupCompetitionResult {
  groupId: string;
  groupNumber: number;
  groupName: string | null;
  result: CompetitionResult;
}

/**
 * Dispatches to the appropriate scoring engine based on competition format,
 * then returns the typed result. For `within_group` competitions, the caller
 * is responsible for filtering the input to a single group first
 * with filtered participants/scores. Or use `calculateGroupedResults`
 * for convenience.
 */
export function calculateCompetitionResults(
  input: CompetitionInput,
): CompetitionResult {
  const { config } = input.competition;

  switch (config.formatType) {
    case 'match_play':
      return {
        type: 'match_play',
        result: calculateMatchPlay(input, config.config),
      };
    case 'best_ball':
      return {
        type: 'best_ball',
        result: calculateBestBall(input, config.config),
      };
    case 'nearest_pin':
      return { type: 'nearest_pin', result: null };
    case 'longest_drive':
      return { type: 'longest_drive', result: null };
    case 'rumble':
      return {
        type: 'rumble',
        result: calculateRumble(input, config.config),
      };
    case 'hi_lo':
      return {
        type: 'hi_lo',
        result: calculateHiLo(input, config.config),
      };
    case 'wolf':
      return {
        type: 'wolf',
        result: calculateWolf(input, config.config, input.gameDecisions ?? []),
      };
    case 'six_point':
      return {
        type: 'six_point',
        result: calculateSixPoint(input, config.config),
      };
    case 'chair':
      return {
        type: 'chair',
        result: calculateChair(input, config),
      };
    default:
      config satisfies never;
      throw new Error(`Unknown format type`);
  }
}

export type { MatchPlayResult, MatchResult } from './match-play';
export type { BestBallResult, BestBallMatchResult } from './best-ball';
export type { RumbleResult, RumbleTeamResult } from './rumble';
export type { HiLoResult, HiLoMatchResult } from './hi-lo';
export type { WolfResult, WolfHoleResult, WolfPlayerResult } from './wolf';
export type { SixPointResult, SixPointPlayerResult } from './six-point';
export type { ChairResult, ChairPlayerResult } from './chair';

/**
 * Builds a combined leaderboard for point-based per-group formats (wolf,
 * six_point, chair) by summing each player's totalPoints across all group
 * results and re-ranking. This avoids re-running the engine with a merged
 * dataset that would produce incorrect rotations or player-count violations.
 */
function mergePointLeaderboards(
  formatType: 'wolf' | 'six_point' | 'chair',
  groupResults: GroupCompetitionResult[],
): CompetitionResult {
  const totals = new Map<
    string,
    { displayName: string; totalPoints: number }
  >();

  for (const gr of groupResults) {
    let leaderboard: {
      roundParticipantId: string;
      displayName: string;
      totalPoints: number;
    }[];

    if (formatType === 'wolf') {
      leaderboard = (gr.result as { type: 'wolf'; result: WolfResult }).result
        .leaderboard;
    } else if (formatType === 'six_point') {
      leaderboard = (gr.result as { type: 'six_point'; result: SixPointResult })
        .result.leaderboard;
    } else {
      leaderboard = (gr.result as { type: 'chair'; result: ChairResult }).result
        .leaderboard;
    }

    for (const entry of leaderboard) {
      const existing = totals.get(entry.roundParticipantId);
      if (existing) {
        existing.totalPoints += entry.totalPoints;
      } else {
        totals.set(entry.roundParticipantId, {
          displayName: entry.displayName,
          totalPoints: entry.totalPoints,
        });
      }
    }
  }

  const merged = Array.from(totals.entries())
    .map(([roundParticipantId, { displayName, totalPoints }]) => ({
      roundParticipantId,
      displayName,
      totalPoints,
      rank: 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  _assignRanks(merged, (p) => p.totalPoints);

  if (formatType === 'wolf') {
    return {
      type: 'wolf',
      result: {
        leaderboard: merged.map((p) => ({
          ...p,
          rotationPosition: 0,
          holeResults: [],
          holesCompleted: 0,
        })),
      },
    };
  }

  if (formatType === 'six_point') {
    return {
      type: 'six_point',
      result: {
        leaderboard: merged.map((p) => ({
          ...p,
          holeScores: [],
          holesCompleted: 0,
        })),
      },
    };
  }

  return {
    type: 'chair',
    result: {
      leaderboard: merged.map((p) => ({
        ...p,
        holeResults: [],
        holesCompleted: 0,
      })),
    },
  };
}

/**
 * Handles group splitting automatically for competitions.
 *
 * For `within_group` scope competitions, iterates over each group in the input,
 * filters participants/scores to that group, and calls `calculateCompetitionResults`
 * once per group. Returns `scope: 'within_group'` with an array of group results.
 *
 * When multiple groups produce results for non-team, non-bonus individual games,
 * also produces a `combined` result that merges all participants and scores across
 * groups into a single ranking. If the engine cannot handle the merged dataset
 * (e.g. six_point requires exactly 3 players), the combined result is omitted.
 *
 * For `all` scope competitions, runs once over all data and returns `scope: 'all'`.
 */
export function calculateGroupedResults(input: CompetitionInput):
  | { scope: 'all'; result: CompetitionResult }
  | {
      scope: 'within_group';
      results: GroupCompetitionResult[];
      combined?: CompetitionResult;
    } {
  const { competition, groups } = input;

  if (
    competition.groupScope !== 'within_group' ||
    !groups ||
    groups.length === 0
  ) {
    return { scope: 'all', result: calculateCompetitionResults(input) };
  }

  const targetGroups = competition.roundGroupId
    ? groups.filter((g) => g.roundGroupId === competition.roundGroupId)
    : groups;

  const groupResults: GroupCompetitionResult[] = [];

  for (const group of targetGroups) {
    const groupParticipantIds = new Set(group.memberParticipantIds);

    const groupParticipants = input.participants.filter((p) =>
      groupParticipantIds.has(p.roundParticipantId),
    );
    const groupScores = input.scores.filter((s) =>
      groupParticipantIds.has(s.roundParticipantId),
    );
    const groupTeams = input.teams?.filter((t) =>
      t.memberParticipantIds.some((id) => groupParticipantIds.has(id)),
    );

    const groupDecisions = input.gameDecisions?.filter(
      (d) => d.roundGroupId === group.roundGroupId || d.roundGroupId === null,
    );

    const groupInput: CompetitionInput = {
      ...input,
      participants: groupParticipants,
      scores: groupScores,
      teams: groupTeams,
      groups: [group],
      gameDecisions: groupDecisions,
    };

    groupResults.push({
      groupId: group.roundGroupId,
      groupNumber: group.groupNumber,
      groupName: group.name,
      result: calculateCompetitionResults(groupInput),
    });
  }

  let combined: CompetitionResult | undefined;

  const formatType = competition.config.formatType;
  const shouldCombine =
    groupResults.length > 1 &&
    !isBonusFormat(formatType) &&
    !isTeamFormat(formatType) &&
    formatType !== 'match_play';

  if (shouldCombine) {
    if (
      formatType === 'wolf' ||
      formatType === 'six_point' ||
      formatType === 'chair'
    ) {
      combined = mergePointLeaderboards(formatType, groupResults);
    } else {
      try {
        combined = calculateCompetitionResults(input);
      } catch {
        // Engine cannot handle the merged dataset — skip the combined result gracefully.
      }
    }
  }

  return { scope: 'within_group', results: groupResults, combined };
}
