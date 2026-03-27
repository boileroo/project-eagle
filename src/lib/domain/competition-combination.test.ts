import { describe, it, expect } from 'vitest';
import { calculateGroupedResults } from './index';
import type {
  CompetitionInput,
  ParticipantData,
  HoleData,
  GroupData,
} from './index';

function makeHoles(count = 9): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

function makeParticipant(
  id: string,
  name: string,
  groupId: string | null,
  hc = 0,
): ParticipantData {
  return {
    roundParticipantId: id,
    personId: `person-${id}`,
    displayName: name,
    effectiveHandicap: hc,
    playingHandicap: hc,
    roundGroupId: groupId,
  };
}

function makeGroup(
  id: string,
  groupNumber: number,
  memberIds: string[],
): GroupData {
  return {
    roundGroupId: id,
    groupNumber,
    name: null,
    memberParticipantIds: memberIds,
  };
}

function makeScore(
  rpId: string,
  hole: number,
  strokes: number,
): CompetitionInput['scores'][0] {
  return { roundParticipantId: rpId, holeNumber: hole, strokes };
}

function makeSixPointInput(
  participants: ParticipantData[],
  scores: CompetitionInput['scores'],
  groups: GroupData[],
): CompetitionInput {
  return {
    competition: {
      id: `c-${groups[0]?.roundGroupId ?? 'all'}`,
      name: 'Six Point',
      config: {
        formatType: 'six_point',
        config: { scoringBasis: 'stableford' },
      },
      groupScope: 'within_group',
      roundGroupId: null,
    },
    holes: makeHoles(),
    participants,
    scores,
    groups,
  };
}

function makeWolfInput(
  participants: ParticipantData[],
  scores: CompetitionInput['scores'],
  groups: GroupData[],
): CompetitionInput {
  return {
    competition: {
      id: `c-${groups[0]?.roundGroupId ?? 'all'}`,
      name: 'Wolf',
      config: { formatType: 'wolf', config: { scoringBasis: 'stableford' } },
      groupScope: 'within_group',
      roundGroupId: null,
    },
    holes: makeHoles(),
    participants,
    scores,
    groups,
  };
}

describe('calculateGroupedResults with multiple groups', () => {
  it('processes within_group scope for each group separately', () => {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');
    const g1p3 = makeParticipant('p3', 'Charlie', 'g1');

    const g2p1 = makeParticipant('p4', 'Dave', 'g2');
    const g2p2 = makeParticipant('p5', 'Eve', 'g2');
    const g2p3 = makeParticipant('p6', 'Frank', 'g2');

    const g1Scores = [
      makeScore('p1', 1, 3),
      makeScore('p2', 1, 4),
      makeScore('p3', 1, 5),
    ];

    const g2Scores = [
      makeScore('p4', 1, 2),
      makeScore('p5', 1, 4),
      makeScore('p6', 1, 5),
    ];

    const g1Groups = [makeGroup('g1', 1, ['p1', 'p2', 'p3'])];
    const g2Groups = [makeGroup('g2', 1, ['p4', 'p5', 'p6'])];

    const input1 = makeSixPointInput([g1p1, g1p2, g1p3], g1Scores, g1Groups);
    const input2 = makeSixPointInput([g2p1, g2p2, g2p3], g2Scores, g2Groups);

    const result1 = calculateGroupedResults(input1);
    const result2 = calculateGroupedResults(input2);

    expect(result1.scope).toBe('within_group');
    expect(result2.scope).toBe('within_group');

    if (result1.scope !== 'within_group' || result2.scope !== 'within_group') {
      throw new Error('Expected within_group scope');
    }

    expect(result1.results).toHaveLength(1);
    expect(result2.results).toHaveLength(1);

    expect(result1.results[0].groupNumber).toBe(1);
    expect(result2.results[0].groupNumber).toBe(1);
  });

  it('different format types produce separate results', () => {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');
    const g1p3 = makeParticipant('p3', 'Charlie', 'g1');

    const scores = [
      makeScore('p1', 1, 3),
      makeScore('p2', 1, 4),
      makeScore('p3', 1, 5),
    ];

    const groups = [makeGroup('g1', 1, ['p1', 'p2', 'p3'])];

    const sixPointInput = makeSixPointInput([g1p1, g1p2, g1p3], scores, groups);
    const wolfInput = makeWolfInput([g1p1, g1p2, g1p3], scores, groups);

    const sixPointResult = calculateGroupedResults(sixPointInput);
    const wolfResult = calculateGroupedResults(wolfInput);

    expect(sixPointResult.scope).toBe('within_group');
    expect(wolfResult.scope).toBe('within_group');

    if (
      sixPointResult.scope !== 'within_group' ||
      wolfResult.scope !== 'within_group'
    ) {
      throw new Error('Expected within_group scope');
    }

    expect(sixPointResult.results[0].result.type).toBe('six_point');
    expect(wolfResult.results[0].result.type).toBe('wolf');
  });
});

describe('combineCompetitionSummaries logic (via calculateGroupedResults)', () => {
  it('two groups playing same format can be identified for combination', () => {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');
    const g1p3 = makeParticipant('p3', 'Charlie', 'g1');

    const g2p1 = makeParticipant('p4', 'Dave', 'g2');
    const g2p2 = makeParticipant('p5', 'Eve', 'g2');
    const g2p3 = makeParticipant('p6', 'Frank', 'g2');

    const g1Scores = [
      makeScore('p1', 1, 3),
      makeScore('p2', 1, 4),
      makeScore('p3', 1, 5),
    ];

    const g2Scores = [
      makeScore('p4', 1, 2),
      makeScore('p5', 1, 4),
      makeScore('p6', 1, 5),
    ];

    const g1Groups = [makeGroup('g1', 1, ['p1', 'p2', 'p3'])];
    const g2Groups = [makeGroup('g2', 1, ['p4', 'p5', 'p6'])];

    const input1 = makeSixPointInput([g1p1, g1p2, g1p3], g1Scores, g1Groups);
    const input2 = makeSixPointInput([g2p1, g2p2, g2p3], g2Scores, g2Groups);

    const result1 = calculateGroupedResults(input1);
    const result2 = calculateGroupedResults(input2);

    expect(result1.scope).toBe('within_group');
    expect(result2.scope).toBe('within_group');

    if (result1.scope !== 'within_group' || result2.scope !== 'within_group') {
      throw new Error('Expected within_group scope');
    }

    const r1Result = result1.results[0].result as {
      type: 'six_point';
      result: { leaderboard: Array<{ displayName: string }> };
    };
    const r2Result = result2.results[0].result as {
      type: 'six_point';
      result: { leaderboard: Array<{ displayName: string }> };
    };

    expect(r1Result.result.leaderboard[0]?.displayName).toBe('Alice');
    expect(r2Result.result.leaderboard[0]?.displayName).toBe('Dave');
  });

  it('different formats should not be combined', () => {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');
    const g1p3 = makeParticipant('p3', 'Charlie', 'g1');

    const scores = [
      makeScore('p1', 1, 3),
      makeScore('p2', 1, 4),
      makeScore('p3', 1, 5),
    ];

    const groups = [makeGroup('g1', 1, ['p1', 'p2', 'p3'])];

    const sixPointInput = makeSixPointInput([g1p1, g1p2, g1p3], scores, groups);
    const wolfInput = makeWolfInput([g1p1, g1p2, g1p3], scores, groups);

    const sixPointResult = calculateGroupedResults(sixPointInput);
    const wolfResult = calculateGroupedResults(wolfInput);

    if (
      sixPointResult.scope !== 'within_group' ||
      wolfResult.scope !== 'within_group'
    ) {
      throw new Error('Expected within_group scope');
    }

    expect(sixPointResult.results[0].result.type).not.toBe(
      wolfResult.results[0].result.type,
    );
  });
});
