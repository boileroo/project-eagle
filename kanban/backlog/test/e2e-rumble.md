# E2E Tests: Rumble (S10)

## What

Playwright E2E tests for the Rumble team competition.

## Context

Depends on `test-infra-e2e-helpers` and `e2e-best-ball` (teams setup pattern) being complete.

Tests live at `e2e/rumble.spec.ts`.

**Setup:**

- Single standalone round
- 8 players, 2 teams (4+4), 2 groups of 4
- Group 1 = all Team A players; Group 2 = all Team B players
- Rumble competition (scope: within_group)

**Test cases:**

### Same-team group constraint

1. Attempt to create a Rumble game and verify that each group must contain players from the same team
2. Try assigning a player from Team B to Group 1 (Team A's group) — verify this is blocked or produces a warning

### Per-hole progressive scoring within a group

On a single hole within Group 1, enter scores so P1 > P2 > P3 > P4 in stableford:

- Verify P1 gets 4 pts, P2 gets 3, P3 gets 2, P4 gets 1

### Tie handling within a group

On a hole where two players tie:

- Two players tie for 1st → each gets (4+3)/2 = 3.5 pts
- Verify the other two players receive 2 and 1

### Accumulation over 18 holes

1. Script all 18 holes with known outcomes for both groups
2. Finalize the round
3. Verify each player's total matches the expected sum of their per-hole allocations
4. Verify Team A total = sum of all Group 1 player totals
5. Verify Team B total = sum of all Group 2 player totals

### Team result

1. Script so Team A total > Team B total → Team A wins
2. Verify the competition result shows Team A as the winner
3. Script so totals are equal → verify a tied result

## Done When

- All tests pass with `yarn test:e2e`
- Same-team group constraint is verified
- Per-hole progressive scoring is verified with known inputs
- Tie-splitting is tested
- Team totals and result are verified
