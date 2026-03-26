import type { ScenarioPreset } from './types';

/**
 * All 14 scenario presets (S1–S14) grouped by test phase.
 *
 * Player handicap assignments:
 *   Test A = 12, Test B = 18, Guest C = 5, Guest D = 24,
 *   Guest E = 15, Guest F = 28, Guest G = 8, Guest H = 20
 *
 * Competition configs match the Zod schemas in `src/lib/competition-config.ts`.
 * Fields using `requiresPairingResolution: true` contain player/team _indices_
 * that `setupScenarioFn` resolves to real IDs at runtime.
 */

// ── Phase 1: Individual Formats (No Teams, Single Group) ─────

export const S1_STABLEFORD: ScenarioPreset = {
  id: 's1-stableford',
  label: 'S1 — Stableford Baseline',
  description: '4 players, 1 group, no game competitions',
  phase: 1,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [],
    },
  ],
};

export const S3_MATCH_PLAY: ScenarioPreset = {
  id: 's3-match-play',
  label: 'S3 — Match Play',
  description: '4 players, 1 group, no teams, Match Play (within_group)',
  phase: 1,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'Singles',
          competitionCategory: 'match',
          groupScope: 'within_group',
          formatType: 'match_play',
          config: {
            pointsPerWin: 1,
            pointsPerHalf: 0.5,
            pairings: [],
          },
          requiresPairingResolution: false,
        },
      ],
    },
  ],
};

export const S4_SIX_POINT: ScenarioPreset = {
  id: 's4-six-point',
  label: 'S4 — Six Point',
  description: '3 players, 1 group, Six Point (within_group)',
  phase: 1,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 10 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2] }],
      competitions: [
        {
          name: 'Six Point',
          competitionCategory: 'game',
          groupScope: 'within_group',
          formatType: 'six_point',
          config: { scoringBasis: 'stableford' },
        },
      ],
    },
  ],
};

export const S5_WOLF: ScenarioPreset = {
  id: 's5-wolf',
  label: 'S5 — Wolf',
  description: '4 players, 1 group, Wolf (within_group)',
  phase: 1,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'Wolf',
          competitionCategory: 'game',
          groupScope: 'within_group',
          formatType: 'wolf',
          config: {},
        },
      ],
    },
  ],
};

export const S6_CHAIR: ScenarioPreset = {
  id: 's6-chair',
  label: 'S6 — Chair',
  description: '4 players, 1 group, Chair (within_group)',
  phase: 1,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'Chair',
          competitionCategory: 'game',
          groupScope: 'within_group',
          formatType: 'chair',
          config: {},
        },
      ],
    },
  ],
};

// ── Phase 2: Multiple Groups & Scope ─────────────────────────

export const S7_GROUPS: ScenarioPreset = {
  id: 's7-groups',
  label: 'S7 — Groups',
  description: '8 players, 2 groups of 4, no game competitions',
  phase: 2,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
    { slot: 'guest', guestName: 'Guest E', handicap: 15 },
    { slot: 'guest', guestName: 'Guest F', handicap: 28 },
    { slot: 'guest', guestName: 'Guest G', handicap: 8 },
    { slot: 'guest', guestName: 'Guest H', handicap: 20 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [
        { playerIndices: [0, 2, 4, 6] },
        { playerIndices: [1, 3, 5, 7] },
      ],
      competitions: [],
    },
  ],
};

// ── Phase 3: Team Formats ────────────────────────────────────

export const S8_BEST_BALL: ScenarioPreset = {
  id: 's8-best-ball',
  label: 'S8 — Best Ball',
  description: '4 players, 2 teams, 1 group, Best Ball (within_group)',
  phase: 3,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  teams: [
    { name: 'Team Alpha', memberIndices: [0, 1] },
    { name: 'Team Bravo', memberIndices: [2, 3] },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'Best Ball',
          competitionCategory: 'match',
          groupScope: 'within_group',
          formatType: 'best_ball',
          config: {
            pointsPerWin: 1,
            pointsPerHalf: 0.5,
            pairings: [{ teamA: 0, teamB: 1 }],
          },
          requiresPairingResolution: true,
        },
      ],
    },
  ],
};

export const S9_HI_LO: ScenarioPreset = {
  id: 's9-hi-lo',
  label: 'S9 — Hi-Lo',
  description: '4 players, 2 teams, 1 group, Hi-Lo (within_group)',
  phase: 3,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  teams: [
    { name: 'Team Alpha', memberIndices: [0, 1] },
    { name: 'Team Bravo', memberIndices: [2, 3] },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'Hi-Lo',
          competitionCategory: 'match',
          groupScope: 'within_group',
          formatType: 'hi_lo',
          config: {
            pointsPerWin: 1,
            pointsPerHalf: 0.5,
          },
        },
      ],
    },
  ],
};

export const S10_RUMBLE: ScenarioPreset = {
  id: 's10-rumble',
  label: 'S10 — Rumble',
  description: '8 players, 2 teams, 2 groups, Rumble (within_group)',
  phase: 3,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest E', handicap: 15 },
    { slot: 'guest', guestName: 'Guest G', handicap: 8 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
    { slot: 'guest', guestName: 'Guest F', handicap: 28 },
    { slot: 'guest', guestName: 'Guest H', handicap: 20 },
  ],
  teams: [
    { name: 'Team Alpha', memberIndices: [0, 1, 2, 3] },
    { name: 'Team Bravo', memberIndices: [4, 5, 6, 7] },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [
        { playerIndices: [0, 1, 2, 3] },
        { playerIndices: [4, 5, 6, 7] },
      ],
      competitions: [
        {
          name: 'Rumble',
          competitionCategory: 'match',
          groupScope: 'within_group',
          formatType: 'rumble',
          config: { pointsPerWin: 1 },
        },
      ],
    },
  ],
};

// ── Phase 4: Bonus Competitions ──────────────────────────────

export const S11_BONUSES: ScenarioPreset = {
  id: 's11-bonuses',
  label: 'S11 — NTP + LD',
  description: '4 players, 1 group, NTP + LD',
  phase: 4,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'NTP Hole 7',
          competitionCategory: 'bonus',
          groupScope: 'all',
          formatType: 'nearest_pin',
          config: {
            holeNumber: 7,
            bonusMode: 'contributor',
            bonusPoints: 1,
          },
        },
        {
          name: 'LD Hole 8',
          competitionCategory: 'bonus',
          groupScope: 'all',
          formatType: 'longest_drive',
          config: {
            holeNumber: 8,
            bonusMode: 'contributor',
            bonusPoints: 1,
          },
        },
      ],
    },
  ],
};

// ── Phase 5: Multi-Format Rounds ─────────────────────────────

export const S12_MULTI_FORMAT: ScenarioPreset = {
  id: 's12-multi-format',
  label: 'S12 — Multi-Format',
  description: '4 players, 1 group, Wolf + NTP',
  phase: 5,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3] }],
      competitions: [
        {
          name: 'Wolf',
          competitionCategory: 'game',
          groupScope: 'within_group',
          formatType: 'wolf',
          config: {},
        },
        {
          name: 'NTP Hole 7',
          competitionCategory: 'bonus',
          groupScope: 'all',
          formatType: 'nearest_pin',
          config: {
            holeNumber: 7,
            bonusMode: 'contributor',
            bonusPoints: 1,
          },
        },
      ],
    },
  ],
};

// ── Phase 6: Tournament Lifecycle ────────────────────────────

export const S13_TWO_ROUND_INDIVIDUAL: ScenarioPreset = {
  id: 's13-two-round-individual',
  label: 'S13 — Two-Round Individual',
  description: '6 players, 2 rounds, no game competitions',
  phase: 6,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
    { slot: 'guest', guestName: 'Guest E', handicap: 15 },
    { slot: 'guest', guestName: 'Guest F', handicap: 28 },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [{ playerIndices: [0, 1, 2, 3, 4, 5] }],
      competitions: [],
    },
    {
      courseIndex: 1,
      groups: [{ playerIndices: [0, 1, 2, 3, 4, 5] }],
      competitions: [],
    },
  ],
};

export const S14_TWO_ROUND_TEAM: ScenarioPreset = {
  id: 's14-two-round-team',
  label: 'S14 — Two-Round Team',
  description: '8 players, 2 teams, 2 rounds, Best Ball per round',
  phase: 6,
  players: [
    { slot: 'test_a', handicap: 12 },
    { slot: 'guest', guestName: 'Guest C', handicap: 5 },
    { slot: 'guest', guestName: 'Guest E', handicap: 15 },
    { slot: 'guest', guestName: 'Guest G', handicap: 8 },
    { slot: 'test_b', handicap: 18 },
    { slot: 'guest', guestName: 'Guest D', handicap: 24 },
    { slot: 'guest', guestName: 'Guest F', handicap: 28 },
    { slot: 'guest', guestName: 'Guest H', handicap: 20 },
  ],
  teams: [
    { name: 'Team Alpha', memberIndices: [0, 1, 2, 3] },
    { name: 'Team Bravo', memberIndices: [4, 5, 6, 7] },
  ],
  rounds: [
    {
      courseIndex: 0,
      groups: [
        { playerIndices: [0, 1, 4, 5] },
        { playerIndices: [2, 3, 6, 7] },
      ],
      competitions: [
        {
          name: 'Best Ball R1',
          competitionCategory: 'match',
          groupScope: 'within_group',
          formatType: 'best_ball',
          config: {
            pointsPerWin: 1,
            pointsPerHalf: 0.5,
            pairings: [{ teamA: 0, teamB: 1 }],
          },
          requiresPairingResolution: true,
        },
      ],
    },
    {
      courseIndex: 1,
      groups: [
        { playerIndices: [0, 2, 5, 7] },
        { playerIndices: [1, 3, 4, 6] },
      ],
      competitions: [
        {
          name: 'Best Ball R2',
          competitionCategory: 'match',
          groupScope: 'within_group',
          formatType: 'best_ball',
          config: {
            pointsPerWin: 1,
            pointsPerHalf: 0.5,
            pairings: [{ teamA: 0, teamB: 1 }],
          },
          requiresPairingResolution: true,
        },
      ],
    },
  ],
};

export const ALL_SCENARIOS: ScenarioPreset[] = [
  S1_STABLEFORD,
  S3_MATCH_PLAY,
  S4_SIX_POINT,
  S5_WOLF,
  S6_CHAIR,
  S7_GROUPS,
  S8_BEST_BALL,
  S9_HI_LO,
  S10_RUMBLE,
  S11_BONUSES,
  S12_MULTI_FORMAT,
  S13_TWO_ROUND_INDIVIDUAL,
  S14_TWO_ROUND_TEAM,
];

export const SCENARIOS_BY_PHASE: Record<number, ScenarioPreset[]> =
  ALL_SCENARIOS.reduce(
    (acc, s) => {
      if (!acc[s.phase]) acc[s.phase] = [];
      acc[s.phase].push(s);
      return acc;
    },
    {} as Record<number, ScenarioPreset[]>,
  );

export const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1: Individual Formats',
  2: 'Phase 2: Multiple Groups',
  3: 'Phase 3: Team Formats',
  4: 'Phase 4: Bonus Competitions',
  5: 'Phase 5: Multi-Format Rounds',
  6: 'Phase 6: Tournament Lifecycle',
};
