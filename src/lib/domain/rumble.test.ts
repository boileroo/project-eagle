import { describe, it, expect } from 'vitest';
import { calculateRumble } from './rumble';
import type {
  CompetitionInput,
  ParticipantData,
  TeamData,
  HoleData,
} from './index';
import type { RumbleConfig } from '../games';

function makeParticipant(id: string, hc = 0): ParticipantData {
  return {
    roundParticipantId: id,
    personId: `person-${id}`,
    displayName: id,
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

function makeHoles(nums: number[]): HoleData[] {
  return nums.map((n) => ({ holeNumber: n, par: 4, strokeIndex: n }));
}

function makeScore(
  rpId: string,
  hole: number,
  strokes: number,
): CompetitionInput['scores'][0] {
  return { roundParticipantId: rpId, holeNumber: hole, strokes };
}

function makeConfig(
  scoringBasis: 'stableford' | 'net' | 'gross' = 'stableford',
): RumbleConfig['config'] {
  return { pointsPerWin: 1, scoringBasis };
}

function makeInput(
  participants: ParticipantData[],
  teams: TeamData[],
  scores: CompetitionInput['scores'],
  holes: HoleData[],
  groups: NonNullable<CompetitionInput['groups']>,
): CompetitionInput {
  return {
    competition: {
      id: 'c1',
      name: 'Test',
      config: { formatType: 'rumble', config: makeConfig() },
      groupScope: 'all',
    },
    holes,
    participants,
    scores,
    teams,
    groups,
  };
}

describe('calculateRumble', () => {
  const p1 = makeParticipant('p1');
  const p2 = makeParticipant('p2');
  const p3 = makeParticipant('p3');
  const p4 = makeParticipant('p4');
  const tA = makeTeam('tA', 'Team A', ['p1', 'p2', 'p3', 'p4']);

  it('skips holes where no player has scored', () => {
    const holes = makeHoles([1]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
    ];
    const result = calculateRumble(
      makeInput([p1, p2, p3, p4], [tA], [], holes, groups),
      makeConfig(),
    );
    expect(result.teamResults[0].teamTotal).toBe(0);
  });

  it('on holes 1-6, counts only top 1 stableford', () => {
    // p1: birdie(3pts), p2: par(2pts), p3: bogey(1pt), p4: double bogey(0)
    const holes = makeHoles([1]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
    ];
    const scores = [
      makeScore('p1', 1, 3), // birdie → 3pts
      makeScore('p2', 1, 4), // par → 2pts
      makeScore('p3', 1, 5), // bogey → 1pt
      makeScore('p4', 1, 6), // double bogey → 0pts
    ];
    const result = calculateRumble(
      makeInput([p1, p2, p3, p4], [tA], scores, holes, groups),
      makeConfig(),
    );
    // countForHole(1) = 1, top 1 = 3
    const groupResult = result.teamResults[0].groupResults[0];
    expect(groupResult.holeScores[0].countUsed).toBe(1);
    expect(groupResult.holeScores[0].groupContribution).toBe(3);
    expect(result.teamResults[0].teamTotal).toBe(3);
  });

  it('on holes 7-12, counts top 2 stableford', () => {
    const holes = makeHoles([7]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
    ];
    const scores = [
      makeScore('p1', 7, 3), // birdie → 3pts
      makeScore('p2', 7, 3), // birdie → 3pts
      makeScore('p3', 7, 5), // bogey → 1pt
      makeScore('p4', 7, 6), // double bogey → 0pts
    ];
    const result = calculateRumble(
      makeInput([p1, p2, p3, p4], [tA], scores, holes, groups),
      makeConfig(),
    );
    // top 2 = 3 + 3 = 6
    expect(result.teamResults[0].groupResults[0].holeScores[0].countUsed).toBe(
      2,
    );
    expect(
      result.teamResults[0].groupResults[0].holeScores[0].groupContribution,
    ).toBe(6);
  });

  it('on holes 13-17, counts top 3 stableford', () => {
    const holes = makeHoles([13]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
    ];
    const scores = [
      makeScore('p1', 13, 3), // 3pts
      makeScore('p2', 13, 4), // 2pts
      makeScore('p3', 13, 5), // 1pt
      makeScore('p4', 13, 6), // 0pts
    ];
    const result = calculateRumble(
      makeInput([p1, p2, p3, p4], [tA], scores, holes, groups),
      makeConfig(),
    );
    // top 3 = 3+2+1 = 6
    expect(result.teamResults[0].groupResults[0].holeScores[0].countUsed).toBe(
      3,
    );
    expect(
      result.teamResults[0].groupResults[0].holeScores[0].groupContribution,
    ).toBe(6);
  });

  it('on hole 18, counts all 4 stableford', () => {
    const holes = makeHoles([18]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
    ];
    const scores = [
      makeScore('p1', 18, 3), // 3pts
      makeScore('p2', 18, 4), // 2pts
      makeScore('p3', 18, 5), // 1pt
      makeScore('p4', 18, 6), // 0pts
    ];
    const result = calculateRumble(
      makeInput([p1, p2, p3, p4], [tA], scores, holes, groups),
      makeConfig(),
    );
    // all 4 = 3+2+1+0 = 6
    expect(result.teamResults[0].groupResults[0].holeScores[0].countUsed).toBe(
      4,
    );
    expect(
      result.teamResults[0].groupResults[0].holeScores[0].groupContribution,
    ).toBe(6);
  });

  it('treats missing player scores as 0 stableford (not a skip)', () => {
    // Only p1 scores; p2, p3, p4 absent → treated as 0
    const holes = makeHoles([1]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
    ];
    const scores = [makeScore('p1', 1, 3)]; // birdie → 3pts
    const result = calculateRumble(
      makeInput([p1, p2, p3, p4], [tA], scores, holes, groups),
      makeConfig(),
    );
    // hasAnyScore=true, countForHole(1)=1, top 1 = 3
    expect(result.teamResults[0].teamTotal).toBe(3);
  });

  it('winning team gets pointsPerWin', () => {
    const p5 = makeParticipant('p5');
    const p6 = makeParticipant('p6');
    const p7 = makeParticipant('p7');
    const p8 = makeParticipant('p8');
    const tB = makeTeam('tB', 'Team B', ['p5', 'p6', 'p7', 'p8']);
    const holes = makeHoles([1]);
    const groups = [
      {
        roundGroupId: 'g1',
        groupNumber: 1,
        name: null,
        memberParticipantIds: ['p1', 'p2', 'p3', 'p4'],
      },
      {
        roundGroupId: 'g2',
        groupNumber: 2,
        name: null,
        memberParticipantIds: ['p5', 'p6', 'p7', 'p8'],
      },
    ];
    const scores = [
      makeScore('p1', 1, 3), // Team A: birdie → 3pts
      makeScore('p2', 1, 5),
      makeScore('p3', 1, 5),
      makeScore('p4', 1, 5),
      makeScore('p5', 1, 5), // Team B: bogey → 1pt
      makeScore('p6', 1, 5),
      makeScore('p7', 1, 5),
      makeScore('p8', 1, 5),
    ];
    const result = calculateRumble(
      makeInput(
        [p1, p2, p3, p4, p5, p6, p7, p8],
        [tA, tB],
        scores,
        holes,
        groups,
      ),
      { pointsPerWin: 1, scoringBasis: 'stableford' },
    );
    const winner = result.teamResults.find((t) => t.teamId === 'tA')!;
    const loser = result.teamResults.find((t) => t.teamId === 'tB')!;
    expect(winner.winner).toBe(true);
    expect(winner.points).toBe(1);
    expect(loser.winner).toBe(false);
    expect(loser.points).toBe(0);
  });
});
