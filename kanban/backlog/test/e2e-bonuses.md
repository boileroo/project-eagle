# E2E Tests: Bonus Competitions (S11)

## What

Playwright E2E tests for Nearest Pin (NTP) and Longest Drive (LD) bonus competitions.

## Context

Depends on `test-infra-e2e-helpers` and `e2e-stableford` being complete. Bonus competitions are added on top of an existing format — these tests layer onto a stableford round.

Tests live at `e2e/bonuses.spec.ts`.

**Setup (shared):**

- Single standalone round, 4 players, 1 group, Stableford + one or more bonus competitions

**Test cases:**

### NTP standalone — badge only

1. Add NTP bonus competition on hole 7 (standalone mode, 0 pts)
2. Open round, enter all scores, award the NTP to player B
3. Finalize the round
4. Verify:
   - Player B has a badge/indicator for NTP hole 7
   - Player B's stableford total is unchanged from their raw score
   - No other player has the NTP badge

### NTP contributor — adds to total

1. Add NTP bonus competition on hole 7 (contributor mode, 1 pt)
2. Score the round, award NTP to player A
3. Finalize and verify:
   - Player A's total = stableford score + 1
   - All other players' totals = raw stableford score
   - If the +1 changes player A's ranking, the leaderboard reflects this

### NTP contributor — 2 points

1. Configure NTP as contributor with 2 pts
2. Award to player C
3. Verify player C's total = stableford + 2

### Longest Drive standalone

1. Add LD bonus on hole 14 (standalone)
2. Award to player D
3. Verify badge shown, no score change

### Longest Drive contributor

1. Add LD contributor (1 pt) on hole 14
2. Award to player B
3. Verify player B's total = stableford + 1

### Multiple bonus competitions

1. Add NTP hole 3 (1 pt) + NTP hole 12 (1 pt) + LD hole 14 (standalone)
2. Player A wins NTP on hole 3; player B wins NTP on hole 12; player C wins LD on hole 14
3. Verify: A total +1, B total +1, C unchanged, LD badge on C

### Same player wins multiple bonuses

1. Player A wins both NTP hole 3 (1 pt) and NTP hole 12 (1 pt)
2. Verify player A's total = stableford + 2

## Done When

- All tests pass with `yarn test:e2e`
- Standalone (badge only) vs contributor (score effect) is verified
- Multi-bonus accumulation is tested
- Badge display is asserted in the UI
