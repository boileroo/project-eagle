import { describe, it, expect } from 'vitest';
import { calculateHiLo } from './hi-lo';
import type {
  CompetitionInput,
  ParticipantData,
  TeamData,
  HoleData,
} from './index';
import type { HiLoConfig } from '../competitions';

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

function makeConfig(): HiLoConfig['config'] {
  return { pointsPerWin: 1, pointsPerHalf: 0.5 };
}

function makeInput(
  participants: ParticipantData[],
  teams: TeamData[],
  scores: CompetitionInput['scores'],
  holes = makeHoles(),
  groups: CompetitionInput['groups'] = [],
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'hi_lo', config: makeConfig() },
      groupScope: 'within_group',
    },
    holes,
    participants,
    scores,
    teams,
    groups,
  };
}

describe('calculateHiLo', () => {
  const a1 = makeParticipant('a1', 'Alice1');
  const a2 = makeParticipant('a2', 'Alice2');
  const b1 = makeParticipant('b1', 'Bob1');
  const b2 = makeParticipant('b2', 'Bob2');
  const tA = makeTeam('tA', 'Team A', ['a1', 'a2']);
  const tB = makeTeam('tB', 'Team B', ['b1', 'b2']);
  const group = {
    roundGroupId: 'g1',
    groupNumber: 1,
    name: 'Group 1',
    memberParticipantIds: ['a1', 'a2', 'b1', 'b2'],
  };

  it('returns empty matches when no groups configured', () => {
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], []),
      makeConfig(),
    );
    expect(result.matches).toHaveLength(0);
  });

  it('skips holes where ANY player is missing a score', () => {
    // Hi-Lo requires ALL 4 players to have scored
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 },
      // b2 missing
    ];
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, makeHoles(), [group]),
      makeConfig(),
    );
    expect(result.matches[0].holesCompleted).toBe(0);
  });

  it('counts 2 points per hole (high ball + low ball)', () => {
    // 1-hole match, Team A wins both sub-matches
    const holes = makeHoles(1);
    // a1:birdie(3), a2:par(2) vs b1:bogey(1), b2:bogey(1)
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 5 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, holes, [group]),
      makeConfig(),
    );
    const match = result.matches[0];
    expect(match.holeResults[0].holePointsA).toBe(2); // wins both
    expect(match.holeResults[0].holePointsB).toBe(0);
  });

  it('splits points when high and low go to different teams', () => {
    // a1:birdie(3pts), a2:bogey(1pt); b1:par(2pts), b2:par(2pts)
    // High ball: A wins (3 > 2), Low ball: B wins (1 < 2)
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 5 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, holes, [group]),
      makeConfig(),
    );
    const hole = result.matches[0].holeResults[0];
    expect(hole.highBall.winner).toBe('A');
    expect(hole.lowBall.winner).toBe('B');
    expect(hole.holePointsA).toBe(1);
    expect(hole.holePointsB).toBe(1);
  });

  it('halves sub-match and awards half points when tied', () => {
    // All players par → high and low both tied
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 4 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 4 },
    ];
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, holes, [group]),
      makeConfig(),
    );
    const hole = result.matches[0].holeResults[0];
    expect(hole.highBall.winner).toBe('halved');
    expect(hole.lowBall.winner).toBe('halved');
    expect(hole.holePointsA).toBe(1); // 0.5 + 0.5
    expect(hole.holePointsB).toBe(1);
  });

  it('winner is null when match is still in progress', () => {
    // Only 1 of 3 holes played
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 5 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, makeHoles(3), [group]),
      makeConfig(),
    );
    expect(result.matches[0].winner).toBeNull();
  });

  it('reports winner once all holes are complete', () => {
    const holes = makeHoles(1);
    const scores = [
      { roundParticipantId: 'a1', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'a2', holeNumber: 1, strokes: 3 },
      { roundParticipantId: 'b1', holeNumber: 1, strokes: 5 },
      { roundParticipantId: 'b2', holeNumber: 1, strokes: 5 },
    ];
    const result = calculateHiLo(
      makeInput([a1, a2, b1, b2], [tA, tB], scores, holes, [group]),
      makeConfig(),
    );
    expect(result.matches[0].winner).toBe('A');
    expect(result.matches[0].pointsA).toBe(1);
    expect(result.matches[0].pointsB).toBe(0);
  });
});
