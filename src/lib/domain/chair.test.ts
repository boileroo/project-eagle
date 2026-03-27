import { describe, it, expect } from 'vitest';
import { calculateChair } from './chair';
import type { CompetitionInput, ParticipantData, HoleData } from './index';

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

function makeInput(
  participants: ParticipantData[],
  scores: CompetitionInput['scores'],
  holes = makeHoles(),
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: {
        formatType: 'chair',
        config: { scoringBasis: 'stableford' as const },
      },
      groupScope: 'within_group',
    },
    holes,
    participants,
    scores,
  };
}

const p1 = makeParticipant('p1', 'Alice');
const p2 = makeParticipant('p2', 'Bob');
const p3 = makeParticipant('p3', 'Charlie');
const p4 = makeParticipant('p4', 'Dave');

describe('calculateChair', () => {
  it('throws when participant count is less than 2', () => {
    expect(() => calculateChair(makeInput([p1], [], makeHoles(1)))).toThrow(
      'Chair requires at least 2 players',
    );
  });

  it('no points on first hole when all tied (chair vacant)', () => {
    const holes = makeHoles(1);
    const scores = ['p1', 'p2', 'p3', 'p4'].map((id) => ({
      roundParticipantId: id,
      holeNumber: 1,
      strokes: 4,
    }));
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    result.leaderboard.forEach((r) => expect(r.totalPoints).toBe(0));
  });

  it('outright winner on hole 1 takes chair but earns no point that hole', () => {
    const holes = makeHoles(1);
    // p1: birdie, rest: par — p1 takes chair but earns no point for acquiring it
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    const p1result = result.leaderboard.find(
      (r) => r.roundParticipantId === 'p1',
    )!;
    expect(p1result.holeResults[0].chairHolderId).toBe('p1');
    expect(p1result.holeResults[0].chairTakenBy).toBe('p1');
    expect(p1result.holeResults[0].pointEarned).toBe(false);
    expect(p1result.totalPoints).toBe(0);
  });

  it('chair holder retains on a tied hole and earns a point', () => {
    const holes = makeHoles(2);
    // Hole 1: p1 wins outright (takes chair, earns 0pt — not awarded for acquiring)
    // Hole 2: all tie → p1 retains chair, earns 1pt for defending
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p1', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p2', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 2, strokes: 4 },
    ];
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    const p1result = result.leaderboard.find(
      (r) => r.roundParticipantId === 'p1',
    )!;
    expect(p1result.holeResults[1].pointEarned).toBe(true);
    expect(p1result.totalPoints).toBe(1);
  });

  it('new winner takes chair from previous holder — neither earns a point on transfer hole', () => {
    const holes = makeHoles(2);
    // Hole 1: p1 outright best → takes chair (0 pts)
    // Hole 2: p2 outright best → takes chair (0 pts — no point for acquiring)
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 1, strokes: 4 },
      // Hole 2: p2 birdie, p1 par
      { roundParticipantId: 'p1', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p2', holeNumber: 2, strokes: 3 },
      { roundParticipantId: 'p3', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 2, strokes: 4 },
    ];
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    const p1result = result.leaderboard.find(
      (r) => r.roundParticipantId === 'p1',
    )!;
    const p2result = result.leaderboard.find(
      (r) => r.roundParticipantId === 'p2',
    )!;
    expect(p1result.totalPoints).toBe(0);
    expect(p2result.totalPoints).toBe(0);
    expect(p1result.holeResults[1].chairHolderId).toBe('p2');
    expect(p1result.holeResults[1].chairTakenBy).toBe('p2');
    expect(p1result.holeResults[1].pointEarned).toBe(false);
  });

  it('holesCompleted incremented for ALL players on scored holes', () => {
    const holes = makeHoles(2);
    const scores = [1, 2].flatMap((h) =>
      ['p1', 'p2', 'p3', 'p4'].map((id) => ({
        roundParticipantId: id,
        holeNumber: h,
        strokes: 4,
      })),
    );
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    result.leaderboard.forEach((r) => expect(r.holesCompleted).toBe(2));
  });

  it('skips holes where any player is missing a score', () => {
    const holes = makeHoles(1);
    // Only p1, p2, p3 score — p4 missing
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    result.leaderboard.forEach((r) => expect(r.holesCompleted).toBe(0));
    result.leaderboard.forEach((r) => expect(r.totalPoints).toBe(0));
  });

  it('leaderboard sorted by points descending with ranks', () => {
    const holes = makeHoles(2);
    // Hole 1: p1 wins outright (takes chair, 0pts)
    // Hole 2: all tie → p1 defends, earns 1pt
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p1', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p2', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 2, strokes: 4 },
      { roundParticipantId: 'p4', holeNumber: 2, strokes: 4 },
    ];
    const result = calculateChair(makeInput([p1, p2, p3, p4], scores, holes));
    expect(result.leaderboard[0].roundParticipantId).toBe('p1');
    expect(result.leaderboard[0].totalPoints).toBe(1);
    expect(result.leaderboard[0].rank).toBe(1);
  });
});
