# E2E Tests: Wolf (S5)

## What

Playwright E2E tests for the Wolf game.

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/wolf.spec.ts`.

**Setup:**

- Single standalone round
- Exactly 4 players, 1 group, Wolf (scope: within_group)

**Test cases:**

### Wolf rotation

1. Open the round and navigate to live scoring
2. On hole 1: verify player 1 is displayed as the wolf
3. On hole 2: verify player 2 is the wolf
4. On hole 5: verify player 1 is the wolf again (rotation wraps)

### Partner selection (partnered wolf)

1. On a hole where player 1 is wolf, select player 3 as partner
2. Enter scores so the wolf+partner side wins (higher stableford)
3. Verify wolf and partner each receive 2 pts; opponents receive 0

### Partner selection — wolf side loses

1. Select a partner; enter scores so the opposing side wins
2. Verify the two opponents each receive 2 pts; wolf and partner receive 0

### Lone wolf wins

1. On a hole where player 2 is wolf, make no partner selection (lone wolf)
2. Enter scores so player 2's stableford beats all three opponents
3. Verify player 2 receives 4 pts; other three receive 0

### Lone wolf loses

1. Lone wolf on a hole; enter scores so at least one opponent beats the wolf
2. Verify wolf receives 0 pts; each of the other three receives 2 pts

### Tie (wolf side = opposing side)

1. Enter scores so wolf side best equals opposing side best on a hole
2. Verify no points are awarded to anyone for that hole

### Full 18-hole game

1. Play through all 18 holes with a mix of partner picks and lone wolf
2. Finalize round and verify the leaderboard shows correct total points per player

## Done When

- All tests pass with `yarn test:e2e`
- All four outcome types (lone win, lone lose, partner win, partner lose) are tested
- Rotation is verified for at least the first 5 holes
- Tie (no points) is tested
