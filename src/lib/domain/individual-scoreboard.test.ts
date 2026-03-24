import { describe, it, expect } from 'vitest';
import { calculateIndividualScoreboard } from './individual-scoreboard';
import type {
  IndividualScoreboardInput,
  BonusAwardInput,
} from './individual-scoreboard';
import type { HoleData, ParticipantData, ResolvedScore } from './index';

function makeHoles(count = 3): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

function makeParticipant(id: string, name: string, hc = 0): ParticipantData {
  return {
    roundParticipantId: id,
    personId: `person-${id}`,
    displayName: name,
    effectiveHandicap: hc,
    playingHandicap: hc,
    roundGroupId: null,
  };
}

function makeScore(rpId: string, hole: number, strokes: number): ResolvedScore {
  return { roundParticipantId: rpId, holeNumber: hole, strokes };
}

function makeInput(
  participants: ParticipantData[],
  scores: ResolvedScore[],
  bonusAwards: BonusAwardInput[] = [],
  holes = makeHoles(),
): IndividualScoreboardInput {
  return { holes, participants, scores, bonusAwards };
}

describe('calculateIndividualScoreboard', () => {
  it('produces one row per participant', () => {
    const result = calculateIndividualScoreboard(
      makeInput(
        [makeParticipant('p1', 'Alice'), makeParticipant('p2', 'Bob')],
        [],
      ),
    );
    expect(result.rows).toHaveLength(2);
  });

  it('calculates grossStrokes, netStrokes, stableford for scored holes', () => {
    const holes = makeHoles(1);
    const scores = [makeScore('p1', 1, 4)]; // par → 2pts stableford
    const result = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice', 0)], scores, [], holes),
    );
    const row = result.rows[0];
    expect(row.grossStrokes).toBe(4);
    expect(row.netStrokes).toBe(4);
    expect(row.stableford).toBe(2);
    expect(row.holesCompleted).toBe(1);
  });

  it('applies playing handicap per hole (SI=1 receives 1 stroke at hc=18)', () => {
    const holes = makeHoles(1);
    // hc 18 → receives 1 stroke on SI=1 → net = gross - 1
    const scores = [makeScore('p1', 1, 5)]; // gross bogey; net par → 2pts
    const result = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice', 18)], scores, [], holes),
    );
    const row = result.rows[0];
    expect(row.holeScores[0].handicapAdjustment).toBe(1);
    expect(row.netStrokes).toBe(4); // 5 - 1
    expect(row.stableford).toBe(2); // net par
  });

  it('null grossStrokes for unplayed holes', () => {
    const scores = [makeScore('p1', 1, 4)]; // only hole 1
    const result = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice')], scores),
    );
    expect(result.rows[0].holeScores[0].grossStrokes).toBe(4);
    expect(result.rows[0].holeScores[1].grossStrokes).toBeNull();
  });

  it('sorts by stableford descending, gross ascending as tiebreaker', () => {
    const holes = makeHoles(1);
    // Alice: birdie (3pts), Bob: par (2pts)
    const scores = [makeScore('p1', 1, 3), makeScore('p2', 1, 4)];
    const result = calculateIndividualScoreboard(
      makeInput(
        [makeParticipant('p1', 'Alice'), makeParticipant('p2', 'Bob')],
        scores,
        [],
        holes,
      ),
    );
    expect(result.rows[0].displayName).toBe('Alice');
    expect(result.rows[0].rank).toBe(1);
    expect(result.rows[1].rank).toBe(2);
  });

  it('ties share rank', () => {
    const holes = makeHoles(1);
    const scores = [makeScore('p1', 1, 4), makeScore('p2', 1, 4)];
    const result = calculateIndividualScoreboard(
      makeInput(
        [makeParticipant('p1', 'Alice'), makeParticipant('p2', 'Bob')],
        scores,
        [],
        holes,
      ),
    );
    expect(result.rows[0].rank).toBe(1);
    expect(result.rows[1].rank).toBe(1);
  });

  it('contributor bonus adds to total and contributorBonusTotal', () => {
    const holes = makeHoles(1);
    const scores = [makeScore('p1', 1, 4)];
    const bonusAwards: BonusAwardInput[] = [
      {
        competitionId: 'cb1',
        competitionName: 'NTP',
        formatType: 'nearest_pin',
        bonusMode: 'contributor',
        bonusPoints: 1,
        holeNumber: 1,
        roundParticipantId: 'p1',
      },
    ];
    const result = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice')], scores, bonusAwards, holes),
    );
    const row = result.rows[0];
    expect(row.contributorBonusTotal).toBe(1);
    expect(row.total).toBe(3); // 2pts stableford + 1 bonus
  });

  it('standalone bonus adds a badge but does not affect total', () => {
    const holes = makeHoles(1);
    const scores = [makeScore('p1', 1, 4)];
    const bonusAwards: BonusAwardInput[] = [
      {
        competitionId: 'sb1',
        competitionName: 'Longest Drive',
        formatType: 'longest_drive',
        bonusMode: 'standalone',
        bonusPoints: 0,
        holeNumber: 18,
        roundParticipantId: 'p1',
      },
    ];
    const result = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice')], scores, bonusAwards, holes),
    );
    const row = result.rows[0];
    expect(row.standaloneBadges).toHaveLength(1);
    expect(row.standaloneBadges[0].shortLabel).toBe('LD H18');
    expect(row.contributorBonusTotal).toBe(0);
    expect(row.total).toBe(2); // stableford only
  });

  it('hasContributorBonuses is true only when contributor bonuses present', () => {
    const withContributor = calculateIndividualScoreboard(
      makeInput(
        [makeParticipant('p1', 'Alice')],
        [],
        [
          {
            competitionId: 'c1',
            competitionName: 'NTP',
            formatType: 'nearest_pin',
            bonusMode: 'contributor',
            bonusPoints: 1,
            holeNumber: 1,
            roundParticipantId: 'p1',
          },
        ],
      ),
    );
    expect(withContributor.hasContributorBonuses).toBe(true);

    const withoutContributor = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice')], []),
    );
    expect(withoutContributor.hasContributorBonuses).toBe(false);
  });

  it('total = stableford + contributorBonusTotal', () => {
    const holes = makeHoles(1);
    const scores = [makeScore('p1', 1, 3)]; // birdie → 3pts
    const bonusAwards: BonusAwardInput[] = [
      {
        competitionId: 'c1',
        competitionName: 'NTP',
        formatType: 'nearest_pin',
        bonusMode: 'contributor',
        bonusPoints: 2,
        holeNumber: 1,
        roundParticipantId: 'p1',
      },
    ];
    const result = calculateIndividualScoreboard(
      makeInput([makeParticipant('p1', 'Alice')], scores, bonusAwards, holes),
    );
    expect(result.rows[0].total).toBe(5); // 3 + 2
  });
});
