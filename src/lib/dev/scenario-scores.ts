/**
 * Deterministic score datasets for each scenario.
 *
 * Each dataset is an array of 18-hole gross score arrays, one per player
 * (matching the player order in the scenario's `players` array).
 *
 * Scores are designed for Hawk's Ridge GC (course 0, par 72) unless noted.
 * S18 R2 and S19 R2 use Falcon Creek CC (course 1, par 71).
 *
 * Hawk's Ridge pars:  [4,3,5,4,4,4,3,5,4, 4,5,3,4,4,4,5,3,4]  = 72
 * Falcon Creek pars:  [4,4,3,5,4,4,3,4,4, 4,3,5,4,4,5,3,4,4]  = 71
 */

type ScoreSet = number[][];

// ── S1 — Stableford Baseline (Hawk's Ridge, par 72) ──────────
// Player A (HC 12): gross 86 → net 74
// Player B (HC 18): gross 94 → net 76
// Guest C (HC 5):   gross 80 → net 75
// Guest D (HC 24):  gross 100 → net 76
export const S1_SCORES: ScoreSet = [
  //  H1  H2  H3  H4  H5  H6  H7  H8  H9  H10 H11 H12 H13 H14 H15 H16 H17 H18
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 5, 5, 5, 3, 5], // A: gross 86 → net 74
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94 → net 76
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 5, 5, 3, 5, 4, 4, 5, 3, 4], // C: gross 80 → net 75
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100 → net 76
];

// ── S2 — Match Play (Hawk's Ridge, par 72) ───────────────────
// Match 1: A(HC12) vs B(HC18) → A wins 2&1
// Match 2: C(HC5) vs D(HC24) → goes to 18th, C wins 1 up
export const S2_SCORES: ScoreSet = [
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // A: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 4, 5, 4, 4, 5, 3, 4], // C: gross 79
  [5, 4, 7, 5, 5, 5, 4, 6, 5, 5, 6, 4, 6, 5, 5, 6, 4, 5], // D: gross 92
];

// ── S3 — Six Point (Hawk's Ridge, par 72) ────────────────────
// 3 players. Scores designed to create varied distributions.
// Player A (HC 12): gross 84
// Player B (HC 18): gross 94
// Guest C (HC 10):  gross 83
export const S3_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 4, 5, 5, 5, 5, 3, 5, 4, 5, 5, 3, 4], // A: gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 6, 4, 5, 4, 4, 5, 5, 5, 5, 3, 5, 4, 4, 5, 3, 5], // C: gross 83
];

// ── S4 — Wolf (Hawk's Ridge, par 72) ─────────────────────────
// 4 players. Mixed results to test partner pick logic.
export const S4_SCORES: ScoreSet = [
  [4, 3, 5, 5, 4, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 83
  [5, 4, 6, 4, 5, 5, 4, 5, 5, 5, 6, 3, 5, 5, 4, 6, 4, 5], // B: gross 90
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // C: gross 76
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 6, 4, 6, 5, 6, 7, 4, 6], // D: gross 99
];

// ── S5 — Chair (Hawk's Ridge, par 72) ────────────────────────
// 4 players. Scores designed for chair changes: C takes chair early,
// A steals it mid-round, D never takes it.
export const S5_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // A: gross 80
  [5, 4, 6, 5, 5, 5, 3, 6, 5, 5, 6, 4, 5, 5, 5, 6, 3, 5], // B: gross 88
  [4, 3, 5, 4, 4, 4, 3, 5, 5, 5, 5, 3, 5, 5, 5, 5, 3, 5], // C: gross 82
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
];

// ── S6–S11 — Groups variants (Hawk's Ridge, par 72) ──────────
// S6, S7, S9, S10, S11 all use this 8-player dataset.
// Group 1 (indices 0,2,4,6): A(HC12), C(HC5), E(HC15), G(HC8)
// Group 2 (indices 1,3,5,7): B(HC18), D(HC24), F(HC28), H(HC20)
export const S6_TO_S11_SCORES: ScoreSet = [
  //  H1  H2  H3  H4  H5  H6  H7  H8  H9  H10 H11 H12 H13 H14 H15 H16 H17 H18
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A (HC12): gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B (HC18): gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // C (HC5):  gross 78
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D (HC24): gross 100
  [5, 3, 6, 5, 5, 4, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E (HC15): gross 90
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F (HC28): gross 104
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 5, 5, 3, 4, 4, 4, 5, 3, 4], // G (HC8):  gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 6, 6, 4, 5, 5, 5, 6, 4, 5], // H (HC20): gross 96
];

// ── S8 — Groups + Six Point (Hawk's Ridge, par 72) ───────────
// 6 players, 2 groups of 3.
// Group 1 (indices 0,1,2): A(HC12), B(HC18), C(HC5)
// Group 2 (indices 3,4,5): D(HC24), E(HC15), F(HC28)
export const S8_SCORES: ScoreSet = [
  //  H1  H2  H3  H4  H5  H6  H7  H8  H9  H10 H11 H12 H13 H14 H15 H16 H17 H18
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A (HC12): gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B (HC18): gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // C (HC5):  gross 78
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D (HC24): gross 100
  [5, 3, 6, 5, 5, 4, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E (HC15): gross 90
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F (HC28): gross 104
];

// ── S12 — Best Ball (Hawk's Ridge, par 72) ───────────────────
// Team Alpha: A(12) + C(5), Team Bravo: B(18) + D(24)
// Designed so Alpha wins on best ball.
export const S12_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 5], // A: gross 82
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 5, 5, 3, 4, 4, 5, 5, 3, 4], // C: gross 78
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
];

// ── S13 — Hi-Lo (Hawk's Ridge, par 72) ───────────────────────
// Same team structure as S12. Different scores for hi-lo variety.
export const S13_SCORES: ScoreSet = [
  [4, 3, 6, 4, 5, 5, 3, 5, 5, 5, 5, 3, 5, 4, 5, 5, 3, 4], // A: gross 83
  [4, 3, 5, 5, 4, 4, 4, 5, 4, 4, 5, 3, 5, 4, 4, 6, 3, 4], // C: gross 80
  [5, 4, 6, 5, 5, 4, 4, 6, 4, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 92
  [6, 4, 7, 6, 6, 5, 5, 7, 5, 6, 6, 4, 6, 5, 6, 7, 4, 5], // D: gross 98
];

// ── S14 — Singles Match Play (Hawk's Ridge, par 72) ──────────
// Team Alpha: A(HC12) + C(HC5), Team Bravo: B(HC18) + D(HC24)
// Cross-team singles: A(0) v B(2), C(1) v D(3)
export const S14_SCORES: ScoreSet = [
  //  H1  H2  H3  H4  H5  H6  H7  H8  H9  H10 H11 H12 H13 H14 H15 H16 H17 H18
  [5,  3,  6,  4,  5,  5,  3,  5,  4,  5,  6,  3,  5,  4,  5,  5,  3,  5], // A (HC12): gross 81
  [4,  3,  5,  4,  5,  4,  3,  5,  4,  4,  5,  4,  5,  4,  4,  5,  3,  4], // C (HC5):  gross 75
  [5,  4,  7,  5,  5,  5,  4,  6,  5,  5,  6,  4,  5,  5,  5,  6,  4,  5], // B (HC18): gross 91
  [6,  4,  7,  5,  6,  5,  4,  7,  5,  6,  7,  4,  6,  5,  6,  7,  4,  5], // D (HC24): gross 99
];

// ── S15 — Rumble (Hawk's Ridge, par 72) ──────────────────────
// 8 players. Group 1: Alpha (A, C, E, G). Group 2: Bravo (B, D, F, H).
export const S15_SCORES: ScoreSet = [
  [5, 3, 5, 4, 5, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 83
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // C: gross 76
  [5, 3, 6, 5, 5, 5, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 91
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // G: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 6, 6, 4, 5, 5, 5, 6, 4, 5], // H: gross 96
];

// ── S16 + S17 — Bonuses / Multi-Format (Hawk's Ridge, par 72) ─
// Reuse S1 scores. Bonus/Wolf competitions evaluated alongside stableford.
export const S16_S17_SCORES: ScoreSet = S1_SCORES;

// ── S18 — Two-Round Individual ────────────────────────────────
// R1: Hawk's Ridge (par 72), R2: Falcon Creek (par 71)
// 6 players.
export const S18_R1_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // C: gross 78
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [5, 3, 6, 5, 5, 4, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 90
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
];

export const S18_R2_SCORES: ScoreSet = [
  [4, 4, 4, 6, 5, 4, 3, 5, 4, 5, 3, 6, 4, 5, 6, 3, 5, 4], // A: gross 84
  [5, 5, 4, 6, 5, 5, 4, 5, 5, 5, 4, 6, 5, 5, 6, 3, 5, 5], // B: gross 93
  [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4], // C: gross 75
  [6, 5, 4, 7, 6, 6, 4, 5, 5, 6, 4, 7, 5, 5, 7, 4, 5, 5], // D: gross 96
  [5, 5, 3, 6, 5, 5, 3, 5, 4, 5, 4, 6, 5, 5, 5, 3, 4, 5], // E: gross 87
  [6, 5, 5, 7, 6, 5, 4, 6, 5, 6, 4, 7, 6, 5, 6, 4, 5, 5], // F: gross 97
];

// ── S19 — Two-Round Team ──────────────────────────────────────
// R1: Hawk's Ridge, R2: Falcon Creek
// 8 players. Alpha: A(0), C(1), E(2), G(3). Bravo: B(4), D(5), F(6), H(7).
export const S19_R1_SCORES: ScoreSet = [
  [5, 3, 5, 4, 5, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 83
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // C: gross 76
  [5, 3, 6, 5, 5, 5, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 91
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // G: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 6, 6, 4, 5, 5, 5, 6, 4, 5], // H: gross 96
];

export const S19_R2_SCORES: ScoreSet = [
  [4, 5, 3, 6, 4, 5, 3, 4, 5, 5, 3, 5, 5, 4, 6, 3, 5, 4], // A: gross 83
  [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 5, 5, 4, 5, 3, 4, 4], // C: gross 76
  [5, 5, 4, 6, 5, 4, 4, 5, 4, 5, 3, 6, 5, 5, 5, 3, 4, 5], // E: gross 87
  [4, 4, 3, 5, 4, 5, 3, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4, 4], // G: gross 78
  [5, 5, 4, 6, 5, 5, 4, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5], // B: gross 93
  [6, 5, 4, 7, 5, 6, 4, 5, 5, 6, 4, 7, 5, 5, 7, 4, 5, 5], // D: gross 95
  [6, 5, 4, 7, 6, 6, 4, 5, 5, 6, 4, 7, 6, 6, 7, 4, 5, 5], // F: gross 101
  [5, 5, 4, 6, 5, 5, 4, 5, 4, 5, 4, 6, 5, 5, 6, 3, 4, 5], // H: gross 91
];

/**
 * Map of scenario ID → per-round score sets.
 * Multi-round scenarios have multiple entries.
 */
export const DETERMINISTIC_SCORES: Record<string, ScoreSet[]> = {
  's1-stableford': [S1_SCORES],
  's2-match-play': [S2_SCORES],
  's3-six-point': [S3_SCORES],
  's4-wolf': [S4_SCORES],
  's5-chair': [S5_SCORES],
  's6-groups': [S6_TO_S11_SCORES],
  's7-groups-wolf': [S6_TO_S11_SCORES],
  's8-groups-six-point': [S8_SCORES],
  's9-groups-match-play': [S6_TO_S11_SCORES],
  's10-groups-mixed': [S6_TO_S11_SCORES],
  's11-groups-different-games': [S6_TO_S11_SCORES],
  's12-best-ball': [S12_SCORES],
  's13-hi-lo': [S13_SCORES],
  's14-singles-match-play': [S14_SCORES],
  's15-rumble': [S15_SCORES],
  's16-bonuses': [S16_S17_SCORES],
  's17-multi-format': [S16_S17_SCORES],
  's18-two-round-individual': [S18_R1_SCORES, S18_R2_SCORES],
  's19-two-round-team': [S19_R1_SCORES, S19_R2_SCORES],
};
