import { describe, it, expect } from 'vitest';
import { calculateMatch, calculateMatchPlay } from './match-play';
import type { HoleData } from './index';

const HOLE: HoleData = { holeNumber: 1, par: 4, strokeIndex: 1 };

function makeHoles(count: number): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

function makeLookup(entries: [string, number][]): Map<string, number> {
  return new Map(entries);
}

describe('calculateMatch (unit)', () => {
  const holes = makeHoles(3);

  it('returns All Square when no scores present', () => {
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      holes,
      makeLookup([]),
      1,
      0,
    );
    expect(result.holesCompleted).toBe(0);
    expect(result.winner).toBeNull();
    expect(result.resultText).toBe('All Square');
  });

  it('A wins a hole with better stableford', () => {
    // A: birdie (3pts), B: par (2pts) — A wins hole
    const lookup = makeLookup([
      ['A:1', 3],
      ['B:1', 5],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      [HOLE],
      lookup,
      1,
      0,
    );
    expect(result.holeResults[0].holeWinner).toBe('A');
    expect(result.matchScore).toBe(1);
  });

  it('halved hole when both players score the same', () => {
    const lookup = makeLookup([
      ['A:1', 4],
      ['B:1', 4],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      [HOLE],
      lookup,
      1,
      0,
    );
    expect(result.holeResults[0].holeWinner).toBe('halved');
    expect(result.matchScore).toBe(0);
  });

  it('declares match decided early when lead exceeds holes remaining', () => {
    // 3-hole match: A wins holes 1 and 2 → leads 2 with 1 remaining → decided after hole 2
    const lookup = makeLookup([
      ['A:1', 3],
      ['B:1', 5], // A wins (birdie vs par)
      ['A:2', 3],
      ['B:2', 5], // A wins
      ['A:3', 4],
      ['B:3', 4], // par vs par
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      makeHoles(3),
      lookup,
      1,
      0,
    );
    expect(result.isDecided).toBe(true);
    expect(result.winner).toBe('A');
    expect(result.resultText).toContain('wins');
    expect(result.resultText).toContain('&');
  });

  it('result text format "X wins N UP" when all holes played', () => {
    // 1-hole match, A wins
    const lookup = makeLookup([
      ['A:1', 3],
      ['B:1', 5],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      [HOLE],
      lookup,
      1,
      0,
    );
    expect(result.resultText).toBe('Alice wins 1 UP');
    expect(result.winner).toBe('A');
    expect(result.pointsA).toBe(1);
    expect(result.pointsB).toBe(0);
  });

  it('awards pointsPerHalf on All Square result', () => {
    const lookup = makeLookup([
      ['A:1', 4],
      ['B:1', 4],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      [HOLE],
      lookup,
      1,
      0.5,
    );
    expect(result.winner).toBe('halved');
    expect(result.pointsA).toBe(0.5);
    expect(result.pointsB).toBe(0.5);
  });

  it('skips holes where either player has no score', () => {
    // Only hole 2 has both scores
    const lookup = makeLookup([
      ['A:2', 3],
      ['B:2', 5],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      makeHoles(3),
      lookup,
      1,
      0,
    );
    expect(result.holesCompleted).toBe(1);
    expect(result.holeResults).toHaveLength(1);
  });

  it('respects handicap strokes — higher hc player gets stroke on SI=1', () => {
    // p2 has hc 18 → receives 1 stroke on SI=1 hole
    // p2 gross=5 → net=4 → par → 2pts; p1 gross=4 → par → 2pts → halved
    const lookup = makeLookup([
      ['A:1', 4],
      ['B:1', 5],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      18,
      [HOLE],
      lookup,
      1,
      0,
    );
    expect(result.holeResults[0].holeWinner).toBe('halved');
  });

  it('in-progress result text shows "X N UP"', () => {
    // 3-hole match, only hole 1 played, A leads 1 up
    const lookup = makeLookup([
      ['A:1', 3],
      ['B:1', 5],
    ]);
    const result = calculateMatch(
      'A',
      'Alice',
      0,
      'B',
      'Bob',
      0,
      makeHoles(3),
      lookup,
      1,
      0,
    );
    expect(result.isDecided).toBe(false);
    expect(result.resultText).toBe('Alice 1 UP');
    expect(result.winner).toBeNull();
  });
});

describe('calculateMatchPlay (dispatcher)', () => {
  it('routes pairings from config', () => {
    const participants = [
      {
        roundParticipantId: 'p1',
        personId: 'person-p1',
        displayName: 'Alice',
        effectiveHandicap: 0,
        playingHandicap: 0,
        roundGroupId: null,
      },
      {
        roundParticipantId: 'p2',
        personId: 'person-p2',
        displayName: 'Bob',
        effectiveHandicap: 0,
        playingHandicap: 0,
        roundGroupId: null,
      },
    ];
    const result = calculateMatchPlay(
      {
        competition: {
          id: 'c1',
          name: 'Test',
          config: {
            formatType: 'match_play',
            config: {
              pointsPerWin: 1,
              pointsPerHalf: 0.5,
              pairings: [{ playerA: 'p1', playerB: 'p2' }],
            },
          },
          groupScope: 'all',
        },
        holes: [HOLE],
        participants,
        scores: [
          { roundParticipantId: 'p1', holeNumber: 1, strokes: 4 },
          { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
        ],
      },
      {
        pointsPerWin: 1,
        pointsPerHalf: 0.5,
        pairings: [{ playerA: 'p1', playerB: 'p2' }],
      },
    );
    expect(result.matches).toHaveLength(1);
  });

  it('derives pairings from groups', () => {
    const participants = [
      {
        roundParticipantId: 'p1',
        personId: 'person-p1',
        displayName: 'Alice',
        effectiveHandicap: 0,
        playingHandicap: 0,
        roundGroupId: 'g1',
      },
      {
        roundParticipantId: 'p2',
        personId: 'person-p2',
        displayName: 'Bob',
        effectiveHandicap: 0,
        playingHandicap: 0,
        roundGroupId: 'g1',
      },
    ];
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: 'Group 1',
        memberParticipantIds: ['p1', 'p2'],
      },
    ];
    const result = calculateMatchPlay(
      {
        competition: {
          id: 'c1',
          name: 'Test',
          config: {
            formatType: 'match_play',
            config: { pointsPerWin: 1, pointsPerHalf: 0, pairings: [] },
          },
          groupScope: 'within_group',
        },
        holes: [HOLE],
        participants,
        scores: [],
        groups,
      },
      { pointsPerWin: 1, pointsPerHalf: 0, pairings: [] },
    );
    expect(result.matches).toHaveLength(1);
  });
});
