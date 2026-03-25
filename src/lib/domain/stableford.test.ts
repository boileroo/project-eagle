import { describe, it, expect } from 'vitest';
import {
  stablefordPoints,
  calculateStableford,
  buildScoreLookup,
} from './stableford';
import type { CompetitionInput, HoleData, ResolvedScore } from './index';

// ---------------------------------------------------------------------------
// Helpers — build minimal CompetitionInput for stableford
// ---------------------------------------------------------------------------

function makeHoles(count: number): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1, // SI 1–18
  }));
}

function makeInput(
  overrides: Partial<CompetitionInput> = {},
): CompetitionInput {
  return {
    competition: {
      id: 'comp-1',
      name: 'Stableford',
      config: { formatType: 'wolf', config: {} },
      groupScope: 'all',
    },
    holes: makeHoles(18),
    participants: [],
    scores: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// stablefordPoints() — unit tests for single-hole calculation
// ---------------------------------------------------------------------------

describe('stablefordPoints', () => {
  it('returns 2 for par (net strokes = par)', () => {
    // gross 4, par 4, 0 handicap adjustment → net 4 → par → 2 pts
    expect(stablefordPoints(4, 4, 0)).toBe(2);
  });

  it('returns 3 for birdie (net 1 under par)', () => {
    // gross 3, par 4, 0 adjustment → net 3 → birdie → 3 pts
    expect(stablefordPoints(3, 4, 0)).toBe(3);
  });

  it('returns 4 for eagle (net 2 under par)', () => {
    expect(stablefordPoints(2, 4, 0)).toBe(4);
  });

  it('returns 5 for albatross (net 3 under par)', () => {
    expect(stablefordPoints(1, 4, 0)).toBe(5);
  });

  it('returns 1 for bogey (net 1 over par)', () => {
    expect(stablefordPoints(5, 4, 0)).toBe(1);
  });

  it('returns 0 for double bogey or worse', () => {
    expect(stablefordPoints(6, 4, 0)).toBe(0);
    expect(stablefordPoints(7, 4, 0)).toBe(0);
    expect(stablefordPoints(10, 4, 0)).toBe(0);
  });

  it('applies handicap adjustment correctly — stroke received turns bogey into par', () => {
    // gross 5, par 4, receives 1 stroke → net 4 → par → 2 pts
    expect(stablefordPoints(5, 4, 1)).toBe(2);
  });

  it('applies handicap adjustment — 2 strokes received turns double bogey into par', () => {
    // gross 6, par 4, receives 2 → net 4 → par → 2 pts
    expect(stablefordPoints(6, 4, 2)).toBe(2);
  });

  it('handles plus handicap (gives strokes) — par becomes bogey', () => {
    // gross 4, par 4, gives 1 stroke (adjustment = -1) → net 5 → bogey → 1 pt
    expect(stablefordPoints(4, 4, -1)).toBe(1);
  });

  it('handles par 3 holes', () => {
    expect(stablefordPoints(3, 3, 0)).toBe(2); // par
    expect(stablefordPoints(2, 3, 0)).toBe(3); // birdie
    expect(stablefordPoints(4, 3, 0)).toBe(1); // bogey
  });

  it('handles par 5 holes', () => {
    expect(stablefordPoints(5, 5, 0)).toBe(2); // par
    expect(stablefordPoints(3, 5, 0)).toBe(4); // eagle
    expect(stablefordPoints(7, 5, 0)).toBe(0); // double bogey
  });

  it('never returns negative points', () => {
    // Extreme case: gross 15 on par 3
    expect(stablefordPoints(15, 3, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildScoreLookup()
// ---------------------------------------------------------------------------

describe('buildScoreLookup', () => {
  it('maps participant:hole to strokes', () => {
    const scores: ResolvedScore[] = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p1', holeNumber: 2, strokes: 5 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 3 },
    ];
    const lookup = buildScoreLookup(scores);
    expect(lookup.get('p1:1')).toBe(4);
    expect(lookup.get('p1:2')).toBe(5);
    expect(lookup.get('p2:1')).toBe(3);
    expect(lookup.get('p2:2')).toBeUndefined();
  });

  it('returns empty map for empty scores', () => {
    expect(buildScoreLookup([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateStableford() — full engine tests
// ---------------------------------------------------------------------------

describe('calculateStableford', () => {
  it('calculates a single player with all pars on scratch handicap', () => {
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Alice',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
      ],
      scores: makeHoles(18).map((h) => ({
        roundParticipantId: 'p1',
        holeNumber: h.holeNumber,
        strokes: 4, // all pars on par 4 course
      })),
    });

    const result = calculateStableford(input);
    expect(result.leaderboard).toHaveLength(1);

    const player = result.leaderboard[0];
    expect(player.totalPoints).toBe(36); // 18 holes × 2 pts
    expect(player.grossTotal).toBe(72); // 18 × 4
    expect(player.netTotal).toBe(72); // scratch handicap
    expect(player.holesCompleted).toBe(18);
    expect(player.rank).toBe(1);
  });

  it('applies handicap strokes correctly across holes', () => {
    // Player with handicap 18 gets 1 stroke on every hole (SI 1–18)
    // If they score gross 5 (bogey) on every par 4:
    //   net = 5 - 1 = 4 = par → 2 pts each
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Bob',
          effectiveHandicap: 18,
          playingHandicap: 18,
          roundGroupId: null,
        },
      ],
      scores: makeHoles(18).map((h) => ({
        roundParticipantId: 'p1',
        holeNumber: h.holeNumber,
        strokes: 5, // bogey on every hole
      })),
    });

    const result = calculateStableford(input);
    const player = result.leaderboard[0];
    expect(player.totalPoints).toBe(36); // net pars → 2 pts each
    expect(player.grossTotal).toBe(90);
    expect(player.netTotal).toBe(72);
  });

  it('ranks multiple players correctly — higher points = better rank', () => {
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Alice',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
        {
          roundParticipantId: 'p2',
          personId: 'person-2',
          displayName: 'Bob',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
      ],
      scores: [
        // Alice: all pars → 36 pts
        ...makeHoles(18).map((h) => ({
          roundParticipantId: 'p1',
          holeNumber: h.holeNumber,
          strokes: 4,
        })),
        // Bob: all bogeys → 18 pts
        ...makeHoles(18).map((h) => ({
          roundParticipantId: 'p2',
          holeNumber: h.holeNumber,
          strokes: 5,
        })),
      ],
    });

    const result = calculateStableford(input);
    expect(result.leaderboard[0].displayName).toBe('Alice');
    expect(result.leaderboard[0].totalPoints).toBe(36);
    expect(result.leaderboard[0].rank).toBe(1);

    expect(result.leaderboard[1].displayName).toBe('Bob');
    expect(result.leaderboard[1].totalPoints).toBe(18);
    expect(result.leaderboard[1].rank).toBe(2);
  });

  it('handles ties — same points get same rank', () => {
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Alice',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
        {
          roundParticipantId: 'p2',
          personId: 'person-2',
          displayName: 'Bob',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
        {
          roundParticipantId: 'p3',
          personId: 'person-3',
          displayName: 'Charlie',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
      ],
      scores: [
        // All three score pars → 36 pts each
        ...['p1', 'p2', 'p3'].flatMap((pid) =>
          makeHoles(18).map((h) => ({
            roundParticipantId: pid,
            holeNumber: h.holeNumber,
            strokes: 4,
          })),
        ),
      ],
    });

    const result = calculateStableford(input);
    expect(result.leaderboard).toHaveLength(3);
    // All tied at rank 1
    for (const player of result.leaderboard) {
      expect(player.totalPoints).toBe(36);
      expect(player.rank).toBe(1);
    }
  });

  it('handles competition ranking: 1, 1, 3 (not 1, 1, 2)', () => {
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Alice',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
        {
          roundParticipantId: 'p2',
          personId: 'person-2',
          displayName: 'Bob',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
        {
          roundParticipantId: 'p3',
          personId: 'person-3',
          displayName: 'Charlie',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
      ],
      scores: [
        // Alice & Bob: pars → 36 pts
        ...['p1', 'p2'].flatMap((pid) =>
          makeHoles(18).map((h) => ({
            roundParticipantId: pid,
            holeNumber: h.holeNumber,
            strokes: 4,
          })),
        ),
        // Charlie: bogeys → 18 pts
        ...makeHoles(18).map((h) => ({
          roundParticipantId: 'p3',
          holeNumber: h.holeNumber,
          strokes: 5,
        })),
      ],
    });

    const result = calculateStableford(input);
    const ranks = result.leaderboard.map((p) => p.rank);
    expect(ranks).toEqual([1, 1, 3]);
  });

  it('handles missing scores (incomplete round) — unscored holes get 0 points', () => {
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Alice',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
      ],
      // Only scored first 9 holes
      scores: makeHoles(9).map((h) => ({
        roundParticipantId: 'p1',
        holeNumber: h.holeNumber,
        strokes: 4,
      })),
    });

    const result = calculateStableford(input);
    const player = result.leaderboard[0];
    expect(player.holesCompleted).toBe(9);
    expect(player.totalPoints).toBe(18); // 9 × 2 pts
    expect(player.grossTotal).toBe(36); // 9 × 4
  });

  it('handles high handicap player (36) receiving 2 strokes on SI 1–18', () => {
    // HC 36 → 2 strokes on every hole (SI 1–18)
    // Gross 6 (double bogey), gets 2 strokes → net 4 → par → 2 pts
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'HighHC',
          effectiveHandicap: 36,
          playingHandicap: 36,
          roundGroupId: null,
        },
      ],
      scores: makeHoles(18).map((h) => ({
        roundParticipantId: 'p1',
        holeNumber: h.holeNumber,
        strokes: 6,
      })),
    });

    const result = calculateStableford(input);
    const player = result.leaderboard[0];
    expect(player.totalPoints).toBe(36); // all net pars
    expect(player.grossTotal).toBe(108); // 18 × 6
    expect(player.netTotal).toBe(72); // 18 × (6 - 2)
  });

  it('handles plus handicap (negative playing handicap) — gives strokes', () => {
    // HC -3: gives 1 stroke on SI 1, 2, 3
    // All gross pars (4): net 5 on SI 1-3 (bogey → 1 pt), net 4 on rest (par → 2 pts)
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Pro',
          effectiveHandicap: -3,
          playingHandicap: -3,
          roundGroupId: null,
        },
      ],
      scores: makeHoles(18).map((h) => ({
        roundParticipantId: 'p1',
        holeNumber: h.holeNumber,
        strokes: 4, // all gross pars
      })),
    });

    const result = calculateStableford(input);
    const player = result.leaderboard[0];
    // SI 1-3: gives 1 stroke → net 5 → bogey → 1 pt (3 holes)
    // SI 4-18: no adjustment → net 4 → par → 2 pts (15 holes)
    expect(player.totalPoints).toBe(3 * 1 + 15 * 2); // 33
  });

  it('returns per-hole breakdown with correct fields', () => {
    const input = makeInput({
      holes: [
        { holeNumber: 1, par: 4, strokeIndex: 1 },
        { holeNumber: 2, par: 3, strokeIndex: 10 },
      ],
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Alice',
          effectiveHandicap: 10,
          playingHandicap: 10,
          roundGroupId: null,
        },
      ],
      scores: [
        { roundParticipantId: 'p1', holeNumber: 1, strokes: 5 },
        { roundParticipantId: 'p1', holeNumber: 2, strokes: 4 },
      ],
    });

    const result = calculateStableford(input);
    const holes = result.leaderboard[0].holeScores;

    // Hole 1: SI 1, HC 10 → gets 1 stroke. Gross 5, net 4, par 4 → 2 pts
    expect(holes[0]).toMatchObject({
      holeNumber: 1,
      par: 4,
      strokeIndex: 1,
      grossStrokes: 5,
      handicapAdjustment: 1,
      netStrokes: 4,
      points: 2,
    });

    // Hole 2: SI 10, HC 10 → gets 1 stroke. Gross 4, net 3, par 3 → 2 pts
    expect(holes[1]).toMatchObject({
      holeNumber: 2,
      par: 3,
      strokeIndex: 10,
      grossStrokes: 4,
      handicapAdjustment: 1,
      netStrokes: 3,
      points: 2,
    });
  });

  it('handles no participants — returns empty leaderboard', () => {
    const result = calculateStableford(makeInput());
    expect(result.leaderboard).toEqual([]);
  });

  it('handles no scores — all holes null, 0 points', () => {
    const input = makeInput({
      participants: [
        {
          roundParticipantId: 'p1',
          personId: 'person-1',
          displayName: 'Ghost',
          effectiveHandicap: 0,
          playingHandicap: 0,
          roundGroupId: null,
        },
      ],
      scores: [],
    });

    const result = calculateStableford(input);
    const player = result.leaderboard[0];
    expect(player.totalPoints).toBe(0);
    expect(player.holesCompleted).toBe(0);
    expect(player.grossTotal).toBe(0);
    expect(player.holeScores.every((h) => h.grossStrokes === null)).toBe(true);
  });
});
