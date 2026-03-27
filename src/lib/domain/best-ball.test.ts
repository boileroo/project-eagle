import { describe, it, expect } from 'vitest';
import { calculateBestBall } from './best-ball';
import type {
  CompetitionInput,
  TeamData,
  ParticipantData,
  HoleData,
} from './index';
import type { BestBallConfig } from '../competitions';

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

function makeTeam(id: string, name: string, members: string[]): TeamData {
  return {
    teamId: id,
    name,
    tournamentTeamId: null,
    memberParticipantIds: members,
  };
}

function makeConfig(): BestBallConfig['config'] {
  return {
    pointsPerWin: 1,
    pointsPerHalf: 0.5,
    pairings: [{ teamA: 'tA', teamB: 'tB' }],
  };
}

function makeInput(
  participants: ParticipantData[],
  teams: TeamData[],
  scores: CompetitionInput['scores'],
  holes = makeHoles(),
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'best_ball', config: makeConfig() },
      groupScope: 'all',
    },
    holes,
    participants,
    scores,
    teams,
  };
}

describe('calculateBestBall', () => {
  const a1 = makeParticipant('a1', 'Alice1');
  const a2 = makeParticipant('a2', 'Alice2');
  const b1 = makeParticipant('b1', 'Bob1');
  const b2 = makeParticipant('b2', 'Bob2');
  const tA = makeTeam('tA', 'Team A', ['a1', 'a2']);
  const tB = makeTeam('tB', 'Team B', ['b1', 'b2']);

  it('returns empty matches with no pairings configured', () => {
    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], []),
      { pointsPerWin: 1, pointsPerHalf: 0.5, pairings: [] },
    );
    expect(result.matches).toHaveLength(0);
  });

  it('skips holes where either team has no scores', () => {
    // Team A scores hole 1, Team B does not
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], scores),
      makeConfig(),
    );
    expect(result.matches[0].holesCompleted).toBe(0);
  });

  it('counts a hole when at least one player from each team has scored', () => {
    // Only a1 and b1 score hole 1
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], scores),
      makeConfig(),
    );
    expect(result.matches[0].holesCompleted).toBe(1);
  });

  it('Team A wins when their best stableford beats Team B', () => {
    // a1 gets birdie (3pts), b1+b2 get par (2pts each)
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 3 }, // birdie → 3pts
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 5 }, // bogey → 1pt
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 }, // par → 2pts
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 4 }, // par → 2pts
    ];
    const result = calculateBestBall(
      makeInput(
        [a1, a2, b1, b2],
        [tA, tB],
        [scores[0], scores[1], scores[2], scores[3]],
      ),
      makeConfig(),
    );
    expect(result.matches[0].holeResults[0].holeWinner).toBe('A');
  });

  it('halves a hole when best stableford from each team is equal', () => {
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 5 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], scores),
      makeConfig(),
    );
    expect(result.matches[0].holeResults[0].holeWinner).toBe('halved');
  });

  it('result text is "All Square" when fully halved', () => {
    // 1-hole match, both teams halve
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, holes),
      makeConfig(),
    );
    expect(result.matches[0].resultText).toBe('All Square');
    expect(result.matches[0].winner).toBe('halved');
  });

  it('marks match as decided when lead exceeds holes remaining', () => {
    // 3-hole match, Team A wins holes 1 and 2
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 3 }, // birdie
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 5 }, // bogey
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 5 },
      { roundParticipantId: 'a1', holeNumber: 2, strokes: 3 },
      { roundParticipantId: 'a2', holeNumber: 2, strokes: 3 },
      { roundParticipantId: 'b1', holeNumber: 2, strokes: 5 },
      { roundParticipantId: 'b2', holeNumber: 2, strokes: 5 },
    ];
    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], scores),
      makeConfig(),
    );
    expect(result.matches[0].isDecided).toBe(true);
    expect(result.matches[0].winner).toBe('A');
  });

  it('uses score at decision time, not final score, in result text', () => {
    // 18-hole match: Team A wins holes 1-10 (up 10-0 after hole 10, 8 remaining, 10 > 8 = DECIDED)
    // Then Team A continues winning to final 18-0 (but should show 10&8)
    const holes = makeHoles(18);
    const scores = [];

    // Holes 1-10: Team A wins (after hole 10, A up 10-0, 8 remaining, 10 > 8? YES - DECIDED at hole 10)
    for (let hole = 1; hole <= 10; hole++) {
      scores.push(
        { roundParticipantId: 'a1', holeNumber: hole, strokes: 3 }, // birdie
        { roundParticipantId: 'a2', holeNumber: hole, strokes: 3 },
        { roundParticipantId: 'b1', holeNumber: hole, strokes: 5 }, // bogey
        { roundParticipantId: 'b2', holeNumber: hole, strokes: 5 },
      );
    }

    // Holes 11-18: Team A continues winning (final 18-0, but decided at 10&8)
    for (let hole = 11; hole <= 18; hole++) {
      scores.push(
        { roundParticipantId: 'a1', holeNumber: hole, strokes: 3 },
        { roundParticipantId: 'a2', holeNumber: hole, strokes: 3 },
        { roundParticipantId: 'b1', holeNumber: hole, strokes: 5 },
        { roundParticipantId: 'b2', holeNumber: hole, strokes: 5 },
      );
    }

    const result = calculateBestBall(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, holes),
      makeConfig(),
    );

    // Should show "Team A wins 10&8" (10 up at decision with 8 holes remaining)
    // NOT "Team A wins 18&0" (final score with 0 holes remaining)
    expect(result.matches[0].resultText).toBe('Team A wins 10&8');
    expect(result.matches[0].isDecided).toBe(true);
    expect(result.matches[0].winner).toBe('A');
  });
});
