# E2E Tests: Stroke Play (S2)

## What

Playwright E2E tests for stroke play (gross and net).

## Context

Depends on `test-infra-e2e-helpers` and `e2e-stableford` being complete (reuse the round creation pattern).

Tests live at `e2e/stroke-play.spec.ts`.

**Setup:**

- Single standalone round
- 4 participants, 1 group

**Test cases:**

### Gross stroke play

1. Add Stroke Play competition with `gross_strokes` basis
2. Enter scores for all 4 players so gross totals are distinct and known
3. Finalize the round
4. Verify the scoreboard ranks players by gross total (lowest = rank 1)
5. Verify the correct gross total is shown for each player

### Net stroke play

1. Add Stroke Play competition with `net_strokes` basis
2. Use players with known handicaps and known gross scores
3. Finalize the round
4. Verify net totals = gross − handicap strokes received
5. Verify ranking is by net total (lowest net = rank 1)
6. Verify that a player with a higher gross but lower net is ranked above one with a lower gross but higher net

### Per-group net (within_group scope)

1. 6 players, 2 groups of 3, Stroke Play with `net_strokes` and `within_group` scope
2. Verify two separate leaderboards appear — one per group
3. Players in different groups do not compete against each other

## Done When

- All tests pass with `yarn test:e2e`
- Gross and net variants are tested independently
- Net calculation is verified with known handicap values
- within_group scope produces separate rankings
