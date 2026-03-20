# E2E Tests: Chair (S6)

## What

Playwright E2E tests for the Chair game.

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/chair.spec.ts`.

**Setup:**

- Single standalone round
- Exactly 4 players, 1 group, Chair (scope: within_group)

**Test cases:**

### Chair taken on hole 1

1. Enter scores for hole 1 so player A has the best stableford
2. Verify player A holds the chair after hole 1
3. Verify the correct point is awarded (check the implementation: does the player earn on the hole they take the chair, or only holes they defend?)

### Chair changes on a subsequent hole

1. Player A holds the chair; on hole 2 player B scores higher than A
2. Verify player B takes the chair
3. Verify the point accumulation for each player is correct

### Chair holder retains (tie)

1. Player A holds the chair; on a hole player B ties A's stableford
2. Verify player A retains the chair

### Chair holder retains (all opponents score lower)

1. Player A holds; all other players score lower than A on a hole
2. Verify A retains; verify A earns a point for that hole

### All players tie on hole 1 (no holder)

1. Enter equal stableford scores for all 4 players on hole 1
2. Verify the chair remains vacant and 0 points are awarded

### All players tie when chair is held

1. After player A takes the chair, enter a hole where all 4 players score the same stableford
2. Verify player A retains; verify point handling (per implementation)

### Full 18-hole game

1. Play a full 18-hole round with a scripted sequence of score presets
2. Finalize and verify total chair points per player are correct
3. Verify players ranked by total chair points

## Done When

- All tests pass with `yarn test:e2e`
- Chair vacancy (hole 1 all-tie) is tested
- Tie-retention rule is tested
- Multi-hole accumulation verified against known totals
