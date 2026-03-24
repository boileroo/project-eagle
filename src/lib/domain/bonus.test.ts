import { describe, it, expect } from 'vitest';
import { formatBonusLabel, getBonusHoles } from './bonus';

describe('formatBonusLabel', () => {
  it('formats nearest_pin', () => {
    expect(formatBonusLabel('nearest_pin', 7)).toBe('Nearest the Pin — Hole 7');
  });

  it('formats longest_drive', () => {
    expect(formatBonusLabel('longest_drive', 14)).toBe(
      'Longest Drive — Hole 14',
    );
  });
});

describe('getBonusHoles', () => {
  it('filters out non-bonus competition types', () => {
    const comps = [
      {
        id: 'c1',
        name: 'NTP',
        formatType: 'nearest_pin',
        configJson: { holeNumber: 3 },
      },
      {
        id: 'c2',
        name: 'Stableford',
        formatType: 'stableford',
        configJson: {},
      },
    ];
    const result = getBonusHoles(comps);
    expect(result).toHaveLength(1);
    expect(result[0].competitionId).toBe('c1');
  });

  it('returns both nearest_pin and longest_drive', () => {
    const comps = [
      {
        id: 'c1',
        name: 'NTP',
        formatType: 'nearest_pin',
        configJson: { holeNumber: 3 },
      },
      {
        id: 'c2',
        name: 'LD',
        formatType: 'longest_drive',
        configJson: { holeNumber: 18 },
      },
    ];
    const result = getBonusHoles(comps);
    expect(result).toHaveLength(2);
  });

  it('filters out entries with holeNumber 0 or missing config', () => {
    const comps = [
      { id: 'c1', name: 'NTP', formatType: 'nearest_pin', configJson: null },
      {
        id: 'c2',
        name: 'LD',
        formatType: 'longest_drive',
        configJson: { holeNumber: 7 },
      },
    ];
    const result = getBonusHoles(comps);
    expect(result).toHaveLength(1);
    expect(result[0].competitionId).toBe('c2');
  });

  it('maps fields correctly', () => {
    const comps = [
      {
        id: 'myId',
        name: 'My NTP',
        formatType: 'nearest_pin',
        configJson: { holeNumber: 5 },
      },
    ];
    const result = getBonusHoles(comps);
    expect(result[0]).toEqual({
      competitionId: 'myId',
      competitionName: 'My NTP',
      formatType: 'nearest_pin',
      holeNumber: 5,
    });
  });

  it('returns empty array for empty input', () => {
    expect(getBonusHoles([])).toEqual([]);
  });
});
