/**
 * Deterministic score datasets for each scenario.
 *
 * Each dataset is an array of 18-hole gross score arrays, one per player
 * (matching the player order in the scenario's `players` array).
 *
 * Scores are designed for Hawk's Ridge GC (course 0, par 72) unless noted.
 * S13 R2 and S14 R2 use Falcon Creek CC (course 1, par 71).
 *
 * Hawk's Ridge pars:  [4,3,5,4,4,4,3,5,4, 4,5,3,4,4,4,5,3,4]  = 72
 * Falcon Creek pars:  [4,4,3,5,4,4,3,4,4, 4,3,5,4,4,5,3,4,4]  = 71
 */

type ScoreSet = number[][];

// ── S1: Stableford Baseline (Hawk's Ridge, par 72) ──────────
// Player A (HC 12): gross 82, net 70 → ~38 stableford pts
// Player B (HC 18): gross 90, net 72 → ~36 pts
// Guest C (HC 5):   gross 76, net 71 → ~37 pts
// Guest D (HC 24):  gross 98, net 74 → ~34 pts
export const S1_SCORES: ScoreSet = [
  //  H1  H2  H3  H4  H5  H6  H7  H8  H9  H10 H11 H12 H13 H14 H15 H16 H17 H18
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 5, 5, 5, 3, 5], // A: gross 86 → net 74
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94 → net 76
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 5, 5, 3, 5, 4, 4, 5, 3, 4], // C: gross 80 → net 75
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100 → net 76
];

// ── S2: Stroke Play (Hawk's Ridge, par 72) ───────────────────
// Same players, different scores to test stroke rankings.
// Player A (HC 12): gross 80
// Player B (HC 18): gross 88
// Guest C (HC 5):   gross 74
// Guest D (HC 24):  gross 96
export const S2_SCORES: ScoreSet = [
  [4, 3, 5, 5, 5, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 84
  [5, 4, 6, 5, 5, 4, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // B: gross 92
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // C: gross 78
  [6, 4, 7, 6, 6, 5, 4, 7, 5, 6, 6, 4, 6, 5, 6, 7, 4, 5], // D: gross 98
];

// ── S3: Match Play (Hawk's Ridge, par 72) ────────────────────
// Match 1: A(HC12) vs B(HC18) → A wins 2&1
// Match 2: C(HC5) vs D(HC24) → goes to 18th, C wins 1 up
export const S3_SCORES: ScoreSet = [
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // A: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 4, 5, 4, 4, 5, 3, 4], // C: gross 79
  [5, 4, 7, 5, 5, 5, 4, 6, 5, 5, 6, 4, 6, 5, 5, 6, 4, 5], // D: gross 92
];

// ── S4: Six Point (Hawk's Ridge, par 72) ─────────────────────
// 3 players. Scores designed to create varied distributions.
// Player A (HC 12): gross 84
// Player B (HC 18): gross 92
// Guest C (HC 10):  gross 82
export const S4_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 4, 5, 5, 5, 5, 3, 5, 4, 5, 5, 3, 4], // A: gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 6, 4, 5, 4, 4, 5, 5, 5, 5, 3, 5, 4, 4, 5, 3, 5], // C: gross 83
];

// ── S5: Wolf (Hawk's Ridge, par 72) ──────────────────────────
// 4 players. Mixed results to test partner pick logic.
export const S5_SCORES: ScoreSet = [
  [4, 3, 5, 5, 4, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 83
  [5, 4, 6, 4, 5, 5, 4, 5, 5, 5, 6, 3, 5, 5, 4, 6, 4, 5], // B: gross 90
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // C: gross 76
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 6, 4, 6, 5, 6, 7, 4, 6], // D: gross 99
];

// ── S6: Chair (Hawk's Ridge, par 72) ─────────────────────────
// 4 players. Scores designed for chair changes: C takes chair early,
// A steals it mid-round, D never takes it.
export const S6_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // A: gross 80
  [5, 4, 6, 5, 5, 5, 3, 6, 5, 5, 6, 4, 5, 5, 5, 6, 3, 5], // B: gross 88
  [4, 3, 5, 4, 4, 4, 3, 5, 5, 5, 5, 3, 5, 5, 5, 5, 3, 5], // C: gross 82
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
];

// ── S7: Groups (Hawk's Ridge, par 72) ────────────────────────
// 8 players, 2 groups.
// Group 1: A(12), C(5), E(15), G(8)
// Group 2: B(18), D(24), F(28), H(20)
export const S7_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // C: gross 78
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [5, 3, 6, 5, 5, 4, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 90
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 5, 5, 3, 4, 4, 4, 5, 3, 4], // G: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 6, 6, 4, 5, 5, 5, 6, 4, 5], // H: gross 96
];

// ── S8: Best Ball (Hawk's Ridge, par 72) ─────────────────────
// Team Alpha: A(12) + C(5), Team Bravo: B(18) + D(24)
// Designed so Alpha wins on best ball.
export const S8_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 5], // A: gross 82
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 5, 5, 3, 4, 4, 5, 5, 3, 4], // C: gross 78
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
];

// ── S9: Hi-Lo (Hawk's Ridge, par 72) ─────────────────────────
// Same team structure as S8. Different scores for hi-lo variety.
export const S9_SCORES: ScoreSet = [
  [4, 3, 6, 4, 5, 5, 3, 5, 5, 5, 5, 3, 5, 4, 5, 5, 3, 4], // A: gross 83
  [4, 3, 5, 5, 4, 4, 4, 5, 4, 4, 5, 3, 5, 4, 4, 6, 3, 4], // C: gross 80
  [5, 4, 6, 5, 5, 4, 4, 6, 4, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 92
  [6, 4, 7, 6, 6, 5, 5, 7, 5, 6, 6, 4, 6, 5, 6, 7, 4, 5], // D: gross 98
];

// ── S10: Rumble (Hawk's Ridge, par 72) ───────────────────────
// 8 players. Group 1: Alpha (A, C, E, G). Group 2: Bravo (B, D, F, H).
export const S10_SCORES: ScoreSet = [
  [5, 3, 5, 4, 5, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 83
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // C: gross 76
  [5, 3, 6, 5, 5, 5, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 91
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // G: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 6, 6, 4, 5, 5, 5, 6, 4, 5], // H: gross 96
];

// ── S11: Bonuses (Hawk's Ridge, par 72) ──────────────────────
// Same as S1 scores, bonuses awarded separately.
export const S11_SCORES: ScoreSet = S1_SCORES;

// ── S12: Multi-Format (Hawk's Ridge, par 72) ─────────────────
// Reuse S1 scores. Wolf + NTP evaluated alongside stableford.
export const S12_SCORES: ScoreSet = S1_SCORES;

// ── S13: Two-Round Individual ────────────────────────────────
// R1: Hawk's Ridge (par 72), R2: Falcon Creek (par 71)
// 6 players.
export const S13_R1_SCORES: ScoreSet = [
  [5, 3, 6, 4, 5, 4, 4, 5, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 84
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // C: gross 78
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [5, 3, 6, 5, 5, 4, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 90
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
];

// R2 on Falcon Creek (par 71): slightly different round
export const S13_R2_SCORES: ScoreSet = [
  [4, 4, 4, 6, 5, 4, 3, 5, 4, 5, 3, 6, 4, 5, 6, 3, 5, 4], // A: gross 84
  [5, 5, 4, 6, 5, 5, 4, 5, 5, 5, 4, 6, 5, 5, 6, 3, 5, 5], // B: gross 93
  [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4], // C: gross 75
  [6, 5, 4, 7, 6, 6, 4, 5, 5, 6, 4, 7, 5, 5, 7, 4, 5, 5], // D: gross 96
  [5, 5, 3, 6, 5, 5, 3, 5, 4, 5, 4, 6, 5, 5, 5, 3, 4, 5], // E: gross 87
  [6, 5, 5, 7, 6, 5, 4, 6, 5, 6, 4, 7, 6, 5, 6, 4, 5, 5], // F: gross 97
];

// ── S14: Two-Round Team ──────────────────────────────────────
// R1: Hawk's Ridge, R2: Falcon Creek
// 8 players. Alpha: A(0), C(1), E(2), G(3). Bravo: B(4), D(5), F(6), H(7).
export const S14_R1_SCORES: ScoreSet = [
  [5, 3, 5, 4, 5, 4, 3, 6, 4, 5, 5, 3, 5, 4, 5, 5, 3, 5], // A: gross 83
  [4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4], // C: gross 76
  [5, 3, 6, 5, 5, 5, 4, 6, 5, 5, 5, 4, 5, 5, 5, 6, 3, 5], // E: gross 91
  [4, 3, 5, 4, 5, 4, 3, 5, 4, 4, 5, 3, 5, 4, 4, 5, 3, 4], // G: gross 79
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 5, 6, 4, 5], // B: gross 94
  [6, 4, 7, 5, 6, 5, 4, 7, 5, 6, 7, 4, 6, 6, 5, 7, 4, 6], // D: gross 100
  [6, 5, 7, 6, 6, 5, 5, 7, 5, 6, 7, 4, 6, 6, 6, 7, 4, 6], // F: gross 104
  [5, 4, 6, 5, 5, 5, 4, 6, 5, 6, 6, 4, 5, 5, 5, 6, 4, 5], // H: gross 96
];

export const S14_R2_SCORES: ScoreSet = [
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
  's2-stroke-play': [S2_SCORES],
  's3-match-play': [S3_SCORES],
  's4-six-point': [S4_SCORES],
  's5-wolf': [S5_SCORES],
  's6-chair': [S6_SCORES],
  's7-groups': [S7_SCORES],
  's8-best-ball': [S8_SCORES],
  's9-hi-lo': [S9_SCORES],
  's10-rumble': [S10_SCORES],
  's11-bonuses': [S11_SCORES],
  's12-multi-format': [S12_SCORES],
  's13-two-round-individual': [S13_R1_SCORES, S13_R2_SCORES],
  's14-two-round-team': [S14_R1_SCORES, S14_R2_SCORES],
};
