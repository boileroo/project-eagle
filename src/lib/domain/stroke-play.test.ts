import { describe, it, expect } from 'vitest';
import { calculateStrokePlay } from './stroke-play';
import type { CompetitionInput } from './index';

function makeHoles(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

function makeParticipant(
  id: string,
  name: string,
  playingHandicap = 0,
): CompetitionInput['participants'][0] {
  return {
    roundParticipantId: id,
    personId: `person-${id}`,
    displayName: name,
    effectiveHandicap: playingHandicap,
    playingHandicap,
    roundGroupId: null,
  };
}

function makeScore(
  roundParticipantId: string,
  holeNumber: number,
  strokes: number,
): CompetitionInput['scores'][0] {
  return { roundParticipantId, holeNumber, strokes };
}

function makeInput(
  participants: CompetitionInput['participants'],
  scores: CompetitionInput['scores'],
  holes = makeHoles(),
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: {
        formatType: 'wolf',
        config: {},
      },
      groupScope: 'all',
    },
    holes,
    participants,
    scores,
  };
}

describe('calculateStrokePlay', () => {
  it('returns scoringBasis from config', () => {
    const result = calculateStrokePlay(
      makeInput([makeParticipant('p1', 'Alice')], []),
      { scoringBasis: 'net_strokes' },
    );
    expect(result.scoringBasis).toBe('net_strokes');
  });

  it('ranks single player with scores', () => {
    const scores = [
      makeScore('p1', 1, 5),
      makeScore('p1', 2, 4),
      makeScore('p1', 3, 4),
    ];
    const result = calculateStrokePlay(
      makeInput([makeParticipant('p1', 'Alice')], scores),
      { scoringBasis: 'gross_strokes' },
    );
    const p = result.leaderboard[0];
    expect(p.rank).toBe(1);
    expect(p.grossTotal).toBe(13);
    expect(p.holesCompleted).toBe(3);
  });

  it('ranks lower gross score first', () => {
    const alice = makeParticipant('p1', 'Alice');
    const bob = makeParticipant('p2', 'Bob');
    const scores = [
      makeScore('p1', 1, 4),
      makeScore('p1', 2, 4),
      makeScore('p1', 3, 4),
      makeScore('p2', 1, 5),
      makeScore('p2', 2, 5),
      makeScore('p2', 3, 5),
    ];
    const result = calculateStrokePlay(makeInput([alice, bob], scores), {
      scoringBasis: 'gross_strokes',
    });
    expect(result.leaderboard[0].displayName).toBe('Alice');
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[1].rank).toBe(2);
  });

  it('assigns tied rank for equal scores', () => {
    const scores = [
      makeScore('p1', 1, 4),
      makeScore('p1', 2, 4),
      makeScore('p1', 3, 4),
      makeScore('p2', 1, 4),
      makeScore('p2', 2, 4),
      makeScore('p2', 3, 4),
    ];
    const result = calculateStrokePlay(
      makeInput(
        [makeParticipant('p1', 'A'), makeParticipant('p2', 'B')],
        scores,
      ),
      { scoringBasis: 'gross_strokes' },
    );
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[1].rank).toBe(1);
  });

  it('pushes no-score players to the bottom with rank 0', () => {
    const alice = makeParticipant('p1', 'Alice');
    const bob = makeParticipant('p2', 'Bob');
    const scores = [
      makeScore('p1', 1, 4),
      makeScore('p1', 2, 4),
      makeScore('p1', 3, 4),
    ];
    const result = calculateStrokePlay(makeInput([alice, bob], scores), {
      scoringBasis: 'gross_strokes',
    });
    const bobResult = result.leaderboard.find((p) => p.displayName === 'Bob')!;
    expect(bobResult.rank).toBe(0);
    expect(bobResult.holesCompleted).toBe(0);
  });

  it('uses net strokes for ranking when basis is net_strokes', () => {
    // Alice: 18hc, Bob: 0hc. Same gross but Alice should rank better with net.
    const holes = [{ holeNumber: 1, par: 4, strokeIndex: 1 }];
    const alice = makeParticipant('p1', 'Alice', 18);
    const bob = makeParticipant('p2', 'Bob', 0);
    const scores = [makeScore('p1', 1, 5), makeScore('p2', 1, 5)];
    const result = calculateStrokePlay(makeInput([alice, bob], scores, holes), {
      scoringBasis: 'net_strokes',
    });
    // Alice: net = 5 - 1 = 4; Bob: net = 5 - 0 = 5
    const aliceResult = result.leaderboard.find(
      (p) => p.displayName === 'Alice',
    )!;
    const bobResult = result.leaderboard.find((p) => p.displayName === 'Bob')!;
    expect(aliceResult.netTotal).toBe(4);
    expect(aliceResult.rank).toBeLessThan(bobResult.rank);
  });

  it('computes relativeToPar correctly', () => {
    // 3 holes par 4 each = par 12; gross 15 → +3
    const scores = [
      makeScore('p1', 1, 5),
      makeScore('p1', 2, 5),
      makeScore('p1', 3, 5),
    ];
    const result = calculateStrokePlay(
      makeInput([makeParticipant('p1', 'Alice')], scores),
      { scoringBasis: 'gross_strokes' },
    );
    expect(result.leaderboard[0].relativeToPar).toBe(3);
  });

  it('returns correct holeScores with null for unplayed holes', () => {
    const scores = [makeScore('p1', 1, 4)];
    const result = calculateStrokePlay(
      makeInput([makeParticipant('p1', 'Alice')], scores),
      { scoringBasis: 'gross_strokes' },
    );
    const holeScores = result.leaderboard[0].holeScores;
    expect(holeScores[0].grossStrokes).toBe(4);
    expect(holeScores[1].grossStrokes).toBeNull();
    expect(holeScores[2].grossStrokes).toBeNull();
  });
});
