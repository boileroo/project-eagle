import { describe, it, expect } from 'vitest';
import { calculateTournamentLeaderboard } from './tournament-leaderboard';
import type { TournamentLeaderboardRoundInput } from './tournament-leaderboard';
import type { IndividualScoreboardRow } from './individual-scoreboard';

function makeRow(
  roundParticipantId: string,
  personId: string,
  displayName: string,
  stableford: number,
  grossStrokes: number,
  holesCompleted: number,
): IndividualScoreboardRow {
  return {
    roundParticipantId,
    personId,
    displayName,
    playingHandicap: 0,
    holeScores: [],
    grossStrokes,
    netStrokes: grossStrokes,
    stableford,
    contributorBonusTotal: 0,
    standaloneBadges: [],
    total: stableford,
    holesCompleted,
    rank: 1,
  };
}

function makeRound(
  roundId: string,
  name: string,
  isFinalised: boolean,
  totalHoles: number,
  rows: IndividualScoreboardRow[],
): TournamentLeaderboardRoundInput {
  return {
    roundId,
    roundName: name,
    isFinalised,
    totalHoles,
    scoreboardRows: rows,
  };
}

describe('calculateTournamentLeaderboard', () => {
  it('returns empty rows with no rounds', () => {
    const result = calculateTournamentLeaderboard({ rounds: [] });
    expect(result.rows).toHaveLength(0);
  });

  it('ignores non-finalised rounds', () => {
    const round = makeRound('r1', 'Round 1', false, 18, [
      makeRow('rp1', 'person1', 'Alice', 30, 72, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [round] });
    // Non-finalised rounds appear in leaderboard but with 'pending' status
    // The person still shows with 0 contribution
    const alice = result.rows.find((r) => r.displayName === 'Alice');
    // Alice is present because pending rounds are still indexed
    expect(alice?.stableford).toBe(0); // no contribution
  });

  it('includes players from finalised rounds with all holes complete', () => {
    const round = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [round] });
    const alice = result.rows.find((r) => r.displayName === 'Alice')!;
    expect(alice).toBeDefined();
    expect(alice.stableford).toBe(36);
    expect(alice.roundsPlayed).toBe(1);
  });

  it('excludes incomplete rounds (holesCompleted < totalHoles)', () => {
    const round = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 20, 60, 9), // only 9 of 18 holes
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [round] });
    // Alice still appears in leaderboard but with no contribution
    const alice = result.rows.find((r) => r.displayName === 'Alice');
    expect(alice?.stableford ?? 0).toBe(0);
  });

  it('aggregates stableford across multiple finalised rounds', () => {
    const r1 = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
    ]);
    const r2 = makeRound('r2', 'Round 2', true, 18, [
      makeRow('rp2', 'person1', 'Alice', 40, 70, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [r1, r2] });
    const alice = result.rows.find((r) => r.displayName === 'Alice')!;
    expect(alice.stableford).toBe(76); // 36 + 40
    expect(alice.roundsPlayed).toBe(2);
  });

  it('sorts by stableford descending, gross ascending tiebreaker', () => {
    const round = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
      makeRow('rp2', 'person2', 'Bob', 40, 70, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [round] });
    expect(result.rows[0].displayName).toBe('Bob');
    expect(result.rows[0].rank).toBe(1);
    expect(result.rows[1].displayName).toBe('Alice');
    expect(result.rows[1].rank).toBe(2);
  });

  it('ties share rank', () => {
    const round = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
      makeRow('rp2', 'person2', 'Bob', 36, 72, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [round] });
    expect(result.rows[0].rank).toBe(1);
    expect(result.rows[1].rank).toBe(1);
  });

  it('round cell has status "absent" for players not in a finalised round', () => {
    const r1 = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
    ]);
    const r2 = makeRound('r2', 'Round 2', true, 18, [
      // Alice not in round 2
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [r1, r2] });
    const alice = result.rows.find((r) => r.displayName === 'Alice')!;
    const r2Cell = alice.roundCells.find((c) => c.roundId === 'r2')!;
    expect(r2Cell.status).toBe('absent');
  });

  it('round cell has status "pending" for non-finalised rounds', () => {
    const r1 = makeRound('r1', 'Round 1', false, 18, [
      makeRow('rp1', 'person1', 'Alice', 20, 60, 9),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [r1] });
    const alice = result.rows.find((r) => r.displayName === 'Alice')!;
    expect(alice.roundCells[0].status).toBe('pending');
  });

  it('round cell has status "counted" when player completed all holes in finalised round', () => {
    const round = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [round] });
    const alice = result.rows[0];
    expect(alice.roundCells[0].status).toBe('counted');
    expect(alice.roundCells[0].stableford).toBe(36);
  });

  it('includes roundParticipantIds from all rounds', () => {
    const r1 = makeRound('r1', 'Round 1', true, 18, [
      makeRow('rp1', 'person1', 'Alice', 36, 72, 18),
    ]);
    const r2 = makeRound('r2', 'Round 2', true, 18, [
      makeRow('rp2', 'person1', 'Alice', 40, 70, 18),
    ]);
    const result = calculateTournamentLeaderboard({ rounds: [r1, r2] });
    const alice = result.rows[0];
    expect(alice.roundParticipantIds).toContain('rp1');
    expect(alice.roundParticipantIds).toContain('rp2');
  });
});
