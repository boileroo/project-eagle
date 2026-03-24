import { describe, it, expect } from 'vitest';
import { calculateWolf } from './wolf';
import type {
  CompetitionInput,
  ParticipantData,
  HoleData,
  GameDecisionData,
} from './index';

function makeHoles(nums: number[]): HoleData[] {
  return nums.map((n) => ({
    holeNumber: n,
    par: 4,
    strokeIndex: n <= 9 ? n : n - 9,
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

function makeScore(
  rpId: string,
  hole: number,
  strokes: number,
): CompetitionInput['scores'][0] {
  return { roundParticipantId: rpId, holeNumber: hole, strokes };
}

function makeInput(
  participants: ParticipantData[],
  scores: CompetitionInput['scores'],
  holes: HoleData[],
  gameDecisions: GameDecisionData[] = [],
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'wolf', config: {} },
      groupScope: 'within_group',
    },
    holes,
    participants,
    scores,
    gameDecisions,
  };
}

const p1 = makeParticipant('p1', 'Player1');
const p2 = makeParticipant('p2', 'Player2');
const p3 = makeParticipant('p3', 'Player3');
const p4 = makeParticipant('p4', 'Player4');

describe('calculateWolf', () => {
  it('returns not_played for holes without all 4 scores', () => {
    const holes = makeHoles([1]);
    const scores = [
      makeScore('p1', 1, 4),
      makeScore('p2', 1, 4),
      makeScore('p3', 1, 4),
      // p4 missing
    ];
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      [],
    );
    expect(result.leaderboard[0].holeResults[0].outcome).toBe('not_played');
  });

  it('wolf rotation: p1 is wolf on hole 1, p2 on hole 2', () => {
    const holes = makeHoles([1, 2]);
    // All par for both holes
    const scores = [1, 2].flatMap((h) =>
      ['p1', 'p2', 'p3', 'p4'].map((id) => makeScore(id, h, 4)),
    );
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      [],
    );
    expect(result.leaderboard[0].holeResults[0].wolfPlayerId).toBe('p1'); // hole 1
    expect(result.leaderboard[0].holeResults[1].wolfPlayerId).toBe('p2'); // hole 2
  });

  it('lone wolf wins: 4 pts for wolf, 0 for others', () => {
    // p1 is wolf on hole 1, goes lone wolf, wins outright
    const holes = makeHoles([1]);
    const scores = [
      makeScore('p1', 1, 2), // eagle → lots of pts
      makeScore('p2', 1, 5), // bogey → 1pt
      makeScore('p3', 1, 5),
      makeScore('p4', 1, 5),
    ];
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      [],
    );
    const p1Result = result.leaderboard.find(
      (r) => r.roundParticipantId === 'p1',
    )!;
    const p2Result = result.leaderboard.find(
      (r) => r.roundParticipantId === 'p2',
    )!;
    expect(p1Result.holeResults[0].outcome).toBe('wolf_wins');
    expect(p1Result.holeResults[0].isLoneWolf).toBe(true);
    const pts = p1Result.holeResults[0].pointsAwarded.find(
      (a) => a.roundParticipantId === 'p1',
    )!;
    expect(pts.points).toBe(4);
    const p2pts = p2Result.holeResults[0].pointsAwarded.find(
      (a) => a.roundParticipantId === 'p2',
    )!;
    expect(p2pts.points).toBe(0);
  });

  it('lone wolf loses: 0 for wolf, 2 pts for each of the other 3', () => {
    // p1 is wolf on hole 1, goes lone wolf, loses
    const holes = makeHoles([1]);
    const scores = [
      makeScore('p1', 1, 6), // 0pts
      makeScore('p2', 1, 3), // birdie → 3pts
      makeScore('p3', 1, 4), // par → 2pts
      makeScore('p4', 1, 4),
    ];
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      [],
    );
    const holeResult = result.leaderboard[0].holeResults[0];
    expect(holeResult.outcome).toBe('wolf_loses');
    const wolfPts = holeResult.pointsAwarded.find(
      (a) => a.roundParticipantId === 'p1',
    )!;
    expect(wolfPts.points).toBe(0);
    ['p2', 'p3', 'p4'].forEach((id) => {
      const pts = holeResult.pointsAwarded.find(
        (a) => a.roundParticipantId === id,
      )!;
      expect(pts.points).toBe(2);
    });
  });

  it('partnered wolf wins: 2 pts each for wolf and partner, 0 for others', () => {
    const holes = makeHoles([1]);
    const decisions: GameDecisionData[] = [
      { holeNumber: 1, data: { wolfPlayerId: 'p1', partnerPlayerId: 'p2' } },
    ];
    const scores = [
      makeScore('p1', 1, 3), // birdie
      makeScore('p2', 1, 3),
      makeScore('p3', 1, 5), // bogey
      makeScore('p4', 1, 5),
    ];
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      decisions,
    );
    const holeResult = result.leaderboard[0].holeResults[0];
    expect(holeResult.outcome).toBe('wolf_wins');
    expect(holeResult.isLoneWolf).toBe(false);
    const p1pts = holeResult.pointsAwarded.find(
      (a) => a.roundParticipantId === 'p1',
    )!;
    const p2pts = holeResult.pointsAwarded.find(
      (a) => a.roundParticipantId === 'p2',
    )!;
    const p3pts = holeResult.pointsAwarded.find(
      (a) => a.roundParticipantId === 'p3',
    )!;
    expect(p1pts.points).toBe(2);
    expect(p2pts.points).toBe(2);
    expect(p3pts.points).toBe(0);
  });

  it('tie gives no points to anyone', () => {
    const holes = makeHoles([1]);
    const scores = ['p1', 'p2', 'p3', 'p4'].map((id) => makeScore(id, 1, 4));
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      [],
    );
    const holeResult = result.leaderboard[0].holeResults[0];
    expect(holeResult.outcome).toBe('tie');
    holeResult.pointsAwarded.forEach((a) => expect(a.points).toBe(0));
  });

  it('leaderboard is sorted by total points descending with ranks', () => {
    // 2 holes: p1 wins hole 1 (lone wolf, 4pts), everyone else 0
    const holes = makeHoles([1, 2]);
    const scores = [
      makeScore('p1', 1, 2),
      makeScore('p2', 1, 5),
      makeScore('p3', 1, 5),
      makeScore('p4', 1, 5),
      makeScore('p1', 2, 4),
      makeScore('p2', 2, 4),
      makeScore('p3', 2, 4),
      makeScore('p4', 2, 4),
    ];
    const result = calculateWolf(
      makeInput([p1, p2, p3, p4], scores, holes),
      [],
    );
    expect(result.leaderboard[0].roundParticipantId).toBe('p1');
    expect(result.leaderboard[0].totalPoints).toBe(4);
    expect(result.leaderboard[0].rank).toBe(1);
  });

  it('rotationPosition reflects player index (1-based)', () => {
    const holes = makeHoles([1]);
    const result = calculateWolf(
      makeInput(
        [p1, p2, p3, p4],
        ['p1', 'p2', 'p3', 'p4'].map((id) => makeScore(id, 1, 4)),
        holes,
      ),
      [],
    );
    const positions = result.leaderboard
      .sort((a, b) => a.rotationPosition - b.rotationPosition)
      .map((r) => r.rotationPosition);
    expect(positions).toEqual([1, 2, 3, 4]);
  });
});
