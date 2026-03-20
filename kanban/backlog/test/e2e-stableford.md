# E2E Tests: Stableford (S1)

## What

Playwright E2E tests for the stableford baseline scenario.

## Context

Depends on `test-infra-playwright` and `test-infra-e2e-helpers` being complete.

Tests live at `e2e/stableford.spec.ts`.

This is the simplest possible round and serves as the foundation for verifying the core score-entry → scoreboard pipeline. All other E2E tests build on what is established here.

**Setup:**

- Single standalone round
- 4 participants, 1 group
- Stableford competition, scope: all

**Test cases:**

### Full round lifecycle

1. Create a new single round with the test course
2. Add 4 participants, assign to 1 group
3. Add a Stableford competition (scope: all)
4. Open the round → verify status changes to "open" / "in play"
5. Enter all 18 hole scores for all 4 players using different score presets (so rankings are deterministic)
6. Finalize the round
7. Verify the scoreboard shows:
   - Correct gross total for each player
   - Correct net total for each player (given known handicaps)
   - Correct stableford total for each player
   - Players ranked correctly (highest stableford = rank 1)

### Scorecard live updates

- Enter a score for one player on hole 1 → the scoreboard on the round page updates without a full page reload

### Ranking with tied stableford

- Configure two players with identical stableford totals
- Verify both receive the same rank (tied)

### Minimum viable: 2 players

- Repeat the full lifecycle test with just 2 players (no groups needed)

## Done When

- All tests pass with `yarn test:e2e`
- Scoreboard columns (gross, net, stableford) are verified with known values
- Ranked-correctly assertion uses deterministic score presets
