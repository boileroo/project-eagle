import { describe, it, expect } from 'vitest';
import { calculateStandings } from './standings';
import type { RoundCompetitionData } from './standings';
import type { CompetitionInput, ParticipantData, HoleData } from './index';

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

function makeHoles(count = 3): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

function makeScore(
  rpId: string,
  hole: number,
  strokes: number,
): CompetitionInput['scores'][0] {
  return { roundParticipantId: rpId, holeNumber: hole, strokes };
}

function makeStablefordInput(
  participants: ParticipantData[],
  scores: CompetitionInput['scores'],
  holes = makeHoles(),
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'wolf', config: { scoringBasis: 'stableford' } },
      groupScope: 'all',
    },
    holes,
    participants,
    scores,
  };
}

function makeStrokePlayInput(
  participants: ParticipantData[],
  scores: CompetitionInput['scores'],
  holes = makeHoles(),
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'wolf', config: { scoringBasis: 'stableford' } },
      groupScope: 'all',
    },
    holes,
    participants,
    scores,
  };
}

describe('calculateStandings — sum_stableford', () => {
  it('returns empty leaderboard with no rounds', () => {
    const result = calculateStandings(
      { method: 'sum_stableford' },
      [],
      'individual',
    );
    expect(result.leaderboard).toHaveLength(0);
    expect(result.sortDirection).toBe('desc');
  });

  it('aggregates stableford points across rounds for individual', () => {
    const p1 = makeParticipant('rp1', 'Alice');
    const p2 = makeParticipant('rp2', 'Bob');
    const round1: RoundCompetitionData = {
      roundId: 'r1',
      roundNumber: 1,
      groups: [],
      competitionInputs: [
        makeStablefordInput(
          [p1, p2],
          [
            makeScore('rp1', 1, 3),
            makeScore('rp1', 2, 4),
            makeScore('rp1', 3, 5), // 3+2+1=6pts
            makeScore('rp2', 1, 5),
            makeScore('rp2', 2, 5),
            makeScore('rp2', 3, 5), // 1+1+1=3pts
          ],
        ),
      ],
    };
    const result = calculateStandings(
      { method: 'sum_stableford' },
      [round1],
      'individual',
    );
    expect(result.leaderboard[0].displayName).toBe('Alice');
    expect(result.leaderboard[0].total).toBeGreaterThan(
      result.leaderboard[1].total,
    );
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[1].rank).toBe(2);
  });

  it('includes contributor bonus points in total', () => {
    const p1 = makeParticipant('rp1', 'Alice');
    const round1: RoundCompetitionData = {
      roundId: 'r1',
      roundNumber: 1,
      groups: [],
      competitionInputs: [
        makeStablefordInput(
          [p1],
          [
            makeScore('rp1', 1, 4),
            makeScore('rp1', 2, 4),
            makeScore('rp1', 3, 4), // 2+2+2=6pts
          ],
        ),
      ],
    };
    const result = calculateStandings(
      { method: 'sum_stableford' },
      [round1],
      'individual',
      [
        {
          roundId: 'r1',
          roundNumber: 1,
          roundParticipantId: 'rp1',
          bonusPoints: 3,
        },
      ],
    );
    expect(result.leaderboard[0].total).toBe(9); // 6 + 3
    expect(result.leaderboard[0].bonusTotal).toBe(3);
  });

  it('assigns tied ranks', () => {
    const p1 = makeParticipant('rp1', 'Alice');
    const p2 = makeParticipant('rp2', 'Bob');
    const round1: RoundCompetitionData = {
      roundId: 'r1',
      roundNumber: 1,
      groups: [],
      competitionInputs: [
        makeStablefordInput(
          [p1, p2],
          [
            makeScore('rp1', 1, 4),
            makeScore('rp1', 2, 4),
            makeScore('rp1', 3, 4),
            makeScore('rp2', 1, 4),
            makeScore('rp2', 2, 4),
            makeScore('rp2', 3, 4),
          ],
        ),
      ],
    };
    const result = calculateStandings(
      { method: 'sum_stableford' },
      [round1],
      'individual',
    );
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[1].rank).toBe(1);
  });
});

describe('calculateStandings — lowest_strokes', () => {
  it('sorts by lowest strokes ascending (lower is better)', () => {
    const p1 = makeParticipant('rp1', 'Alice');
    const p2 = makeParticipant('rp2', 'Bob');
    // Alice: 3+4+4=11, Bob: 5+5+5=15 → Alice wins
    const round1: RoundCompetitionData = {
      roundId: 'r1',
      roundNumber: 1,
      groups: [],
      competitionInputs: [
        makeStrokePlayInput(
          [p1, p2],
          [
            makeScore('rp1', 1, 3),
            makeScore('rp1', 2, 4),
            makeScore('rp1', 3, 4),
            makeScore('rp2', 1, 5),
            makeScore('rp2', 2, 5),
            makeScore('rp2', 3, 5),
          ],
        ),
      ],
    };
    const result = calculateStandings(
      { method: 'lowest_strokes', config: { scoringBasis: 'gross_strokes' } },
      [round1],
      'individual',
    );
    expect(result.leaderboard[0].displayName).toBe('Alice');
    expect(result.sortDirection).toBe('asc');
  });
});

describe('calculateStandings — match_wins', () => {
  it('returns desc sortDirection', () => {
    const result = calculateStandings(
      { method: 'match_wins', config: { pointsPerWin: 1, pointsPerHalf: 0.5 } },
      [],
      'individual',
    );
    expect(result.sortDirection).toBe('desc');
  });

  it('counts match win points from match_play results', () => {
    const p1 = makeParticipant('rp1', 'Alice');
    const p2 = makeParticipant('rp2', 'Bob');
    // Alice wins all holes of 1-hole match → she gets pointsPerWin
    const round1: RoundCompetitionData = {
      roundId: 'r1',
      roundNumber: 1,
      groups: [],
      competitionInputs: [
        {
          competition: {
            id: 'c1',
            name: 'MP',
            config: {
              formatType: 'match_play',
              config: {
                pointsPerWin: 2,
                pointsPerHalf: 1,
                pairings: [{ playerA: 'rp1', playerB: 'rp2' }],
              },
            },
            groupScope: 'all',
          },
          holes: makeHoles(1),
          participants: [p1, p2],
          scores: [makeScore('rp1', 1, 3), makeScore('rp2', 1, 5)], // Alice birdie, Bob bogey
        },
      ],
    };
    const result = calculateStandings(
      { method: 'match_wins', config: { pointsPerWin: 2, pointsPerHalf: 1 } },
      [round1],
      'individual',
    );
    const alice = result.leaderboard.find((e) => e.displayName === 'Alice')!;
    const bob = result.leaderboard.find((e) => e.displayName === 'Bob')!;
    expect(alice.total).toBe(2);
    expect(bob.total).toBe(0);
  });
});
