# E2E Tests: Six Point (S4)

## What

Playwright E2E tests for the Six Point game.

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/six-point.spec.ts`.

**Setup:**

- Single standalone round
- 3 players, 1 group, Six Point (scope: within_group)

**Test cases:**

### Stableford basis — outright winner per hole

1. Create round with 3 players, add Six Point (stableford basis)
2. Enter scores for all 18 holes using presets where player A always scores best, B second, C third
3. Finalize and verify:
   - A received 4 pts per hole × 18 = 72 pts
   - B received 2 pts per hole × 18 = 36 pts
   - C received 0 pts × 18 = 0 pts

### Tie distributions

Use targeted hole scores (not all 18 need to differ) to exercise each tie case:

- All 3 players tie → 2/2/2 on that hole
- Two players tie for 1st → 3/3/0 on that hole
- Two players tie for last (2nd/3rd) → 4/1/1 on that hole

Verify the running totals reflect the tie splits correctly.

### Gross basis

1. Same setup but Six Point configured with gross scoring basis
2. Enter gross strokes so rankings differ from stableford (e.g. a high handicap player gets fewer stableford pts but lower gross)
3. Verify Six Point ranks by gross strokes (lowest gross = 1st)

### Two independent games (6 players, 2 groups of 3)

1. 6 players, 2 groups of 3, Six Point (within_group)
2. Enter different scores per group
3. Verify two separate Six Point results — one per group, no cross-group comparison

## Done When

- All tests pass with `yarn test:e2e`
- All tie distributions (2/2/2, 3/3/0, 4/1/1) are verified against known scores
- Total points invariant (6 × holes played) is implicitly confirmed by the score assertions
