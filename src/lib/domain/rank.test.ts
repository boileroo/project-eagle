import { describe, it, expect } from 'vitest';
import { assignRanks } from './rank';

function makeItems(scores: number[]) {
  return scores.map((score) => ({ score, rank: 0 }));
}

describe('assignRanks', () => {
  it('assigns rank 1 to a single item', () => {
    const items = makeItems([10]);
    assignRanks(items, (i) => i.score);
    expect(items[0].rank).toBe(1);
  });

  it('assigns sequential ranks when all scores are distinct', () => {
    const items = makeItems([30, 20, 10]);
    assignRanks(items, (i) => i.score);
    expect(items.map((i) => i.rank)).toEqual([1, 2, 3]);
  });

  it('assigns tied rank when two items share the same score', () => {
    const items = makeItems([20, 20, 10]);
    assignRanks(items, (i) => i.score);
    expect(items.map((i) => i.rank)).toEqual([1, 1, 3]);
  });

  it('uses standard competition ranking (1,2,2,4) — no rank 3', () => {
    const items = makeItems([40, 30, 30, 20]);
    assignRanks(items, (i) => i.score);
    expect(items.map((i) => i.rank)).toEqual([1, 2, 2, 4]);
  });

  it('handles three-way tie at the top', () => {
    const items = makeItems([10, 10, 10, 5]);
    assignRanks(items, (i) => i.score);
    expect(items.map((i) => i.rank)).toEqual([1, 1, 1, 4]);
  });

  it('handles all scores tied', () => {
    const items = makeItems([5, 5, 5]);
    assignRanks(items, (i) => i.score);
    expect(items.map((i) => i.rank)).toEqual([1, 1, 1]);
  });

  it('handles empty array without error', () => {
    const items: { score: number; rank: number }[] = [];
    expect(() => assignRanks(items, (i) => i.score)).not.toThrow();
  });

  it('mutates the array in-place', () => {
    const items = makeItems([10, 5]);
    const ref = items[0];
    assignRanks(items, (i) => i.score);
    expect(ref.rank).toBe(1);
  });

  it('works with negative scores', () => {
    const items = makeItems([-5, -10, -10, -20]);
    assignRanks(items, (i) => i.score);
    expect(items.map((i) => i.rank)).toEqual([1, 2, 2, 4]);
  });
});
