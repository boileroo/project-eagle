# E2E Tests: Match Play (S3)

## What

Playwright E2E tests for singles match play.

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/match-play.spec.ts`.

**Setup:**

- Single standalone round
- 4 players, 1 group, Match Play (scope: within_group)

**Test cases:**

### Auto-pairing (4 players, within_group)

1. Create round with 4 players in 1 group, add Match Play competition
2. Open round — verify players are auto-paired (1v2, 3v4)
3. Enter scores hole by hole to drive known outcomes (e.g. match 1: player A wins 2 holes, player B wins 1, rest halved)
4. Finalize and verify:
   - Match 1 result is correct (e.g. "1 up" or "2&1")
   - Match 2 result is correct
   - Results are independent

### Match decided early

1. Enter scores such that player A goes 5 up after 14 holes (winning 5&4)
2. Enter scores for holes 15–18 that would change the result if applied
3. Verify the final result is still 5&4 (early conclusion locked)

### All square after 18

1. Enter scores so match 1 ends exactly all square
2. Verify the result is shown as "A/S" (or equivalent)
3. Verify each side receives the correct `pointsPerHalf` value

### Minimal: 2 players, explicit pairing

1. Create round with 2 players in 1 group, Match Play
2. Verify a single match is created between them
3. Score and verify result

## Done When

- All tests pass with `yarn test:e2e`
- Auto-pairing is verified
- Early conclusion is tested with score entries after conclusion
- All-square result is tested
