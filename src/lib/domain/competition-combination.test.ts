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

describe('calculateGroupedResults combined leaderboard', () => {
  function makeMultiGroupChairInput(options?: {
    roundGroupId?: string | null;
  }): CompetitionInput {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');

    const g2p1 = makeParticipant('p4', 'Dave', 'g2');
    const g2p2 = makeParticipant('p5', 'Eve', 'g2');

    const scores = [
      makeScore('p1', 1, 3),
      makeScore('p2', 1, 4),
      makeScore('p4', 1, 2),
      makeScore('p5', 1, 5),
    ];

    const groups = [
      makeGroup('g1', 1, ['p1', 'p2']),
      makeGroup('g2', 2, ['p4', 'p5']),
    ];

    return {
      competition: {
        id: 'c-chair',
        name: 'Chair',
        config: {
          formatType: 'chair',
          config: { scoringBasis: 'stableford' as const },
        },
        groupScope: 'within_group',
        roundGroupId: options?.roundGroupId ?? null,
      },
      holes: makeHoles(),
      participants: [g1p1, g1p2, g2p1, g2p2],
      scores,
      groups,
    };
  }

  it('produces combined result when multiple groups play an individual game', () => {
    const input = makeMultiGroupChairInput();
    const result = calculateGroupedResults(input);

    expect(result.scope).toBe('within_group');
    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');

    expect(result.results).toHaveLength(2);
    expect(result.combined).toBeDefined();
    expect(result.combined!.type).toBe('chair');
  });

  it('combined result includes all participants from all groups', () => {
    const input = makeMultiGroupChairInput();
    const result = calculateGroupedResults(input);

    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');

    const combinedResult = result.combined as {
      type: 'chair';
      result: { leaderboard: Array<{ displayName: string }> };
    };

    const names = combinedResult.result.leaderboard.map((l) => l.displayName);
    expect(names).toHaveLength(4);
    expect(names).toContain('Alice');
    expect(names).toContain('Dave');
  });

  it('gracefully skips combined when engine rejects merged dataset (six_point needs exactly 3)', () => {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');
    const g1p3 = makeParticipant('p3', 'Charlie', 'g1');

    const g2p1 = makeParticipant('p4', 'Dave', 'g2');
    const g2p2 = makeParticipant('p5', 'Eve', 'g2');
    const g2p3 = makeParticipant('p6', 'Frank', 'g2');

    const input: CompetitionInput = {
      competition: {
        id: 'c-6pt',
        name: 'Six Point',
        config: {
          formatType: 'six_point',
          config: { scoringBasis: 'stableford' as const },
        },
        groupScope: 'within_group',
        roundGroupId: null,
      },
      holes: makeHoles(),
      participants: [g1p1, g1p2, g1p3, g2p1, g2p2, g2p3],
      scores: [
        makeScore('p1', 1, 3),
        makeScore('p2', 1, 4),
        makeScore('p3', 1, 5),
        makeScore('p4', 1, 2),
        makeScore('p5', 1, 4),
        makeScore('p6', 1, 5),
      ],
      groups: [
        makeGroup('g1', 1, ['p1', 'p2', 'p3']),
        makeGroup('g2', 2, ['p4', 'p5', 'p6']),
      ],
    };

    const result = calculateGroupedResults(input);

    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');
    expect(result.results).toHaveLength(2);
    expect(result.combined).toBeUndefined();
  });

  it('does NOT produce combined result for single group', () => {
    const p1 = makeParticipant('p1', 'Alice', 'g1');
    const p2 = makeParticipant('p2', 'Bob', 'g1');
    const p3 = makeParticipant('p3', 'Charlie', 'g1');

    const input: CompetitionInput = {
      competition: {
        id: 'c-single',
        name: 'Six Point',
        config: {
          formatType: 'six_point',
          config: { scoringBasis: 'stableford' },
        },
        groupScope: 'within_group',
        roundGroupId: null,
      },
      holes: makeHoles(),
      participants: [p1, p2, p3],
      scores: [
        makeScore('p1', 1, 3),
        makeScore('p2', 1, 4),
        makeScore('p3', 1, 5),
      ],
      groups: [makeGroup('g1', 1, ['p1', 'p2', 'p3'])],
    };

    const result = calculateGroupedResults(input);

    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');
    expect(result.results).toHaveLength(1);
    expect(result.combined).toBeUndefined();
  });

  it('does NOT produce combined result for team formats (best_ball)', () => {
    const g1p1 = makeParticipant('p1', 'Alice', 'g1');
    const g1p2 = makeParticipant('p2', 'Bob', 'g1');
    const g1p3 = makeParticipant('p3', 'Charlie', 'g1');
    const g1p4 = makeParticipant('p7', 'Grace', 'g1');

    const g2p1 = makeParticipant('p4', 'Dave', 'g2');
    const g2p2 = makeParticipant('p5', 'Eve', 'g2');
    const g2p3 = makeParticipant('p6', 'Frank', 'g2');
    const g2p4 = makeParticipant('p8', 'Henry', 'g2');

    const scores = [
      makeScore('p1', 1, 3),
      makeScore('p2', 1, 4),
      makeScore('p7', 1, 4),
      makeScore('p3', 1, 5),
      makeScore('p4', 1, 2),
      makeScore('p5', 1, 4),
      makeScore('p8', 1, 4),
      makeScore('p6', 1, 5),
    ];

    const input: CompetitionInput = {
      competition: {
        id: 'c-best-ball',
        name: 'Best Ball',
        config: {
          formatType: 'best_ball',
          config: {
            pointsPerWin: 1,
            pointsPerHalf: 0.5,
            pairings: [
              { teamA: 'tt1', teamB: 'tt2' },
              { teamA: 'tt3', teamB: 'tt4' },
            ],
          },
        },
        groupScope: 'within_group',
        roundGroupId: null,
      },
      holes: makeHoles(),
      participants: [g1p1, g1p2, g1p3, g1p4, g2p1, g2p2, g2p3, g2p4],
      scores,
      groups: [
        makeGroup('g1', 1, ['p1', 'p2', 'p3', 'p7']),
        makeGroup('g2', 2, ['p4', 'p5', 'p6', 'p8']),
      ],
      teams: [
        {
          teamId: 't1',
          name: 'Team A',
          tournamentTeamId: 'tt1',
          memberParticipantIds: ['p1', 'p2'],
        },
        {
          teamId: 't2',
          name: 'Team B',
          tournamentTeamId: 'tt2',
          memberParticipantIds: ['p3', 'p7'],
        },
        {
          teamId: 't3',
          name: 'Team C',
          tournamentTeamId: 'tt3',
          memberParticipantIds: ['p4', 'p5'],
        },
        {
          teamId: 't4',
          name: 'Team D',
          tournamentTeamId: 'tt4',
          memberParticipantIds: ['p6', 'p8'],
        },
      ],
    };

    const result = calculateGroupedResults(input);

    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');
    expect(result.results).toHaveLength(2);
    expect(result.combined).toBeUndefined();
  });

  it('does NOT produce combined result for bonus formats', () => {
    const input: CompetitionInput = {
      competition: {
        id: 'c-np',
        name: 'Nearest Pin',
        config: {
          formatType: 'nearest_pin',
          config: {
            holeNumber: 1,
            bonusMode: 'standalone' as const,
            bonusPoints: 1,
          },
        },
        groupScope: 'within_group',
        roundGroupId: null,
      },
      holes: makeHoles(),
      participants: [
        makeParticipant('p1', 'Alice', 'g1'),
        makeParticipant('p2', 'Bob', 'g2'),
      ],
      scores: [],
      groups: [makeGroup('g1', 1, ['p1']), makeGroup('g2', 2, ['p2'])],
    };

    const result = calculateGroupedResults(input);

    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');
    expect(result.combined).toBeUndefined();
  });

  it('returns scope "all" when groupScope is not within_group', () => {
    const input: CompetitionInput = {
      competition: {
        id: 'c-all',
        name: 'Nearest Pin',
        config: {
          formatType: 'nearest_pin',
          config: {
            holeNumber: 1,
            bonusMode: 'standalone' as const,
            bonusPoints: 1,
          },
        },
        groupScope: 'all',
        roundGroupId: null,
      },
      holes: makeHoles(),
      participants: [makeParticipant('p1', 'Alice', null)],
      scores: [],
      groups: [],
    };

    const result = calculateGroupedResults(input);
    expect(result.scope).toBe('all');
    if (result.scope !== 'all') throw new Error('Expected all');
    expect(result.result.type).toBe('nearest_pin');
  });

  it('filters to specific group when roundGroupId is set', () => {
    const input = makeMultiGroupChairInput({ roundGroupId: 'g1' });
    const result = calculateGroupedResults(input);

    if (result.scope !== 'within_group')
      throw new Error('Expected within_group');

    expect(result.results).toHaveLength(1);
    expect(result.results[0].groupId).toBe('g1');
    expect(result.combined).toBeUndefined();
  });
});
