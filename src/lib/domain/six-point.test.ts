import { describe, it, expect } from 'vitest';
import { calculateSixPoint } from './six-point';
import type { CompetitionInput, ParticipantData, HoleData } from './index';
import type { SixPointConfig } from '../competitions';

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
  config: SixPointConfig['config'],
  holes = makeHoles(),
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'six_point', config },
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

describe('calculateSixPoint', () => {
  it('throws when participant count is not 3', () => {
    const twoPlayers = [p1, p2];
    expect(() =>
      calculateSixPoint(
        makeInput(twoPlayers, [], { scoringBasis: 'stableford' }),
        { scoringBasis: 'stableford' },
      ),
    ).toThrow('Six-point requires exactly 3 players');
  });

  it('skips hole if any player has no score', () => {
    // Only p1 and p2 score hole 1
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }),
      { scoringBasis: 'stableford' },
    );
    expect(result.leaderboard.every((r) => r.totalPoints === 0)).toBe(true);
  });

  it('distributes 4/2/0 for clear win/place/show with stableford', () => {
    // p1: birdie(3pts), p2: par(2pts), p3: bogey(1pt)
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }, holes),
      { scoringBasis: 'stableford' },
    );
    const pts = (id: string) =>
      result.leaderboard.find((r) => r.roundParticipantId === id)!.totalPoints;
    expect(pts('p1')).toBe(4);
    expect(pts('p2')).toBe(2);
    expect(pts('p3')).toBe(0);
  });

  it('splits 4+2=6 among two tied 1st: 3/3/0', () => {
    // p1 and p2 both birdie, p3 bogey
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }, holes),
      { scoringBasis: 'stableford' },
    );
    const pts = (id: string) =>
      result.leaderboard.find((r) => r.roundParticipantId === id)!.totalPoints;
    expect(pts('p1')).toBe(3);
    expect(pts('p2')).toBe(3);
    expect(pts('p3')).toBe(0);
  });

  it('splits 2+0=2 among two tied 2nd: 4/1/1', () => {
    // p1 birdie, p2 and p3 par
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }, holes),
      { scoringBasis: 'stableford' },
    );
    const pts = (id: string) =>
      result.leaderboard.find((r) => r.roundParticipantId === id)!.totalPoints;
    expect(pts('p1')).toBe(4);
    expect(pts('p2')).toBe(1);
    expect(pts('p3')).toBe(1);
  });

  it('splits all 4+2+0=6 among three-way tie: 2/2/2', () => {
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }, holes),
      { scoringBasis: 'stableford' },
    );
    result.leaderboard.forEach((r) => expect(r.totalPoints).toBe(2));
  });

  it('gross basis: lower score is better', () => {
    const holes = makeHoles(1);
    // p1: 3 (lowest), p2: 4, p3: 5 (highest)
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'gross' }, holes),
      { scoringBasis: 'gross' },
    );
    const pts = (id: string) =>
      result.leaderboard.find((r) => r.roundParticipantId === id)!.totalPoints;
    expect(pts('p1')).toBe(4); // lowest gross wins
    expect(pts('p2')).toBe(2);
    expect(pts('p3')).toBe(0);
  });

  it('ranks players by total points descending', () => {
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }, holes),
      { scoringBasis: 'stableford' },
    );
    expect(result.leaderboard[0].roundParticipantId).toBe('p1');
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[1].rank).toBe(2);
    expect(result.leaderboard[2].rank).toBe(3);
  });

  it('accumulates points across multiple holes', () => {
    const holes = makeHoles(2);
    const scores = [
      { roundParticipantId: 'p1', holeNumber: 1, strokes: 3 }, // 4pts
      { roundParticipantId: 'p2', holeNumber: 1, strokes: 4 }, // 2pts
      { roundParticipantId: 'p3', holeNumber: 1, strokes: 5 }, // 0pts
      { roundParticipantId: 'p1', holeNumber: 2, strokes: 4 }, // 2pts (par)
      { roundParticipantId: 'p2', holeNumber: 2, strokes: 3 }, // 4pts (birdie)
      { roundParticipantId: 'p3', holeNumber: 2, strokes: 5 }, // 0pts
    ];
    const result = calculateSixPoint(
      makeInput([p1, p2, p3], scores, { scoringBasis: 'stableford' }, holes),
      { scoringBasis: 'stableford' },
    );
    const pts = (id: string) =>
      result.leaderboard.find((r) => r.roundParticipantId === id)!.totalPoints;
    expect(pts('p1')).toBe(6); // 4 + 2
    expect(pts('p2')).toBe(6); // 2 + 4
    expect(pts('p3')).toBe(0);
  });
});
