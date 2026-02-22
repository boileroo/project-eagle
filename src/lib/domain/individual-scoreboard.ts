// ──────────────────────────────────────────────
// Individual Scoreboard Engine
//
// Pure functions. No DB access.
// Always auto-computed from raw scores. Not configurable.
//
// Produces per-player rows with:
//   grossStrokes, netStrokes, stableford,
//   contributorBonusTotal, standaloneBadges, total,
//   holesCompleted, rank
//
// Bonus awards are passed in pre-resolved from the DB.
// ──────────────────────────────────────────────

import { getStrokesOnHole } from '../handicaps';
import { stablefordPoints, buildScoreLookup } from './stableford';
import type { HoleData, ParticipantData, ResolvedScore } from './index';

// ──────────────────────────────────────────────
// Input types
// ──────────────────────────────────────────────

export interface IndividualScoreboardInput {
  holes: HoleData[];
  participants: ParticipantData[];
  scores: ResolvedScore[];
  /** Bonus awards for contributor and standalone comps in this round */
  bonusAwards: BonusAwardInput[];
}

export interface BonusAwardInput {
  competitionId: string;
  competitionName: string;
  formatType: 'nearest_pin' | 'longest_drive';
  /** 'standalone' = badge only; 'contributor' = adds bonusPoints to Total */
  bonusMode: 'standalone' | 'contributor';
  bonusPoints: number;
  holeNumber: number;
  roundParticipantId: string | null;
}

// ──────────────────────────────────────────────
// Output types
// ──────────────────────────────────────────────

export interface IndividualHoleScore {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  grossStrokes: number | null;
  strokesReceived: number;
  netStrokes: number | null;
  stableford: number;
}

export interface StandaloneBadge {
  competitionId: string;
  label: string;
  /** e.g. "NTP H3" */
  shortLabel: string;
  holeNumber: number;
}

export interface IndividualScoreboardRow {
  roundParticipantId: string;
  personId: string;
  displayName: string;
  playingHandicap: number;
  holeScores: IndividualHoleScore[];
  grossStrokes: number;
  netStrokes: number;
  stableford: number;
  /** Sum of points from contributor bonus comps */
  contributorBonusTotal: number;
  /** Badges for standalone bonus comps won */
  standaloneBadges: StandaloneBadge[];
  /**
   * Stableford + contributorBonusTotal.
   * Only meaningful if contributor bonuses exist in the round.
   */
  total: number;
  holesCompleted: number;
  rank: number;
}

export interface IndividualScoreboardResult {
  rows: IndividualScoreboardRow[];
  /** Whether any contributor bonus comps exist in this round */
  hasContributorBonuses: boolean;
}

// ──────────────────────────────────────────────
// Main function
// ──────────────────────────────────────────────

export function calculateIndividualScoreboard(
  input: IndividualScoreboardInput,
): IndividualScoreboardResult {
  const scoreLookup = buildScoreLookup(input.scores);
  const sortedHoles = [...input.holes].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );

  const hasContributorBonuses = input.bonusAwards.some(
    (b) => b.bonusMode === 'contributor',
  );

  const rows: IndividualScoreboardRow[] = input.participants.map((p) => {
    let grossStrokes = 0;
    let netStrokes = 0;
    let stablefordTotal = 0;
    let holesCompleted = 0;

    const holeScores: IndividualHoleScore[] = sortedHoles.map((hole) => {
      const key = `${p.roundParticipantId}:${hole.holeNumber}`;
      const gross = scoreLookup.get(key) ?? null;
      const strokesReceived = getStrokesOnHole(
        p.playingHandicap,
        hole.strokeIndex,
      );

      let net: number | null = null;
      let pts = 0;

      if (gross !== null) {
        net = gross - strokesReceived;
        pts = stablefordPoints(gross, hole.par, strokesReceived);
        grossStrokes += gross;
        netStrokes += net;
        stablefordTotal += pts;
        holesCompleted++;
      }

      return {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        grossStrokes: gross,
        strokesReceived,
        netStrokes: net,
        stableford: pts,
      };
    });

    // Resolve bonuses for this player
    const myAwards = input.bonusAwards.filter(
      (b) => b.roundParticipantId === p.roundParticipantId,
    );

    let contributorBonusTotal = 0;
    const standaloneBadges: StandaloneBadge[] = [];

    for (const award of myAwards) {
      if (award.bonusMode === 'contributor') {
        contributorBonusTotal += award.bonusPoints;
      } else {
        const typeLabel = award.formatType === 'nearest_pin' ? 'NTP' : 'LD';
        standaloneBadges.push({
          competitionId: award.competitionId,
          label: award.competitionName,
          shortLabel: `${typeLabel} H${award.holeNumber}`,
          holeNumber: award.holeNumber,
        });
      }
    }

    return {
      roundParticipantId: p.roundParticipantId,
      personId: p.personId,
      displayName: p.displayName,
      playingHandicap: p.playingHandicap,
      holeScores,
      grossStrokes,
      netStrokes,
      stableford: stablefordTotal,
      contributorBonusTotal,
      standaloneBadges,
      total: stablefordTotal + contributorBonusTotal,
      holesCompleted,
      rank: 0,
    };
  });

  // Sort by stableford descending (primary), then gross ascending (tiebreak)
  rows.sort((a, b) => {
    if (b.stableford !== a.stableford) return b.stableford - a.stableford;
    return a.grossStrokes - b.grossStrokes;
  });

  // Assign ranks (ties share position)
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) {
      const prev = rows[i - 1];
      const curr = rows[i];
      if (
        curr.stableford !== prev.stableford ||
        curr.grossStrokes !== prev.grossStrokes
      ) {
        rank = i + 1;
      }
    }
    rows[i].rank = rank;
  }

  return { rows, hasContributorBonuses };
}
