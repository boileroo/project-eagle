# E2E Tests: Multi-Format Rounds (S12)

## What

Playwright E2E tests for rounds with multiple competitions stacked simultaneously.

## Context

Depends on `test-infra-e2e-helpers` and the individual format E2E tests (stableford, wolf, chair, best ball) being complete.

Tests live at `e2e/multi-format.spec.ts`.

**Test cases:**

### Stableford + Chair (4 players, 1 group)

1. Create round with 4 players, 1 group
2. Add Stableford (scope: all) AND Chair (scope: within_group)
3. Score all 18 holes
4. Finalize and verify:
   - Stableford leaderboard ranks all 4 players by stableford total
   - Chair result shows correct chair points per player
   - Both results are shown independently on the round page

### Stableford + Wolf + NTP contributor (4 players, 1 group)

1. Add Stableford (all) + Wolf (within_group) + NTP contributor hole 7 (1 pt)
2. Score all 18 holes, make wolf partner decisions, award NTP to player B
3. Finalize and verify:
   - Stableford leaderboard totals include the NTP bonus for player B
   - Wolf results are correct per-hole
   - Three competition sections appear on the results page
4. Verify the NTP +1 on player B's stableford total changes their rank if applicable

### Stableford + Best Ball + NTP standalone (4 players, 2 teams)

1. Enable teams, add Stableford (all) + Best Ball (within_group) + NTP standalone hole 12
2. Score, award NTP to any player
3. Verify:
   - Stableford individual ranking is unaffected by the NTP (standalone = no score)
   - Best Ball match result is correct
   - NTP badge shown on the winner, no score change

### Stableford + Six Point (3 players, 1 group)

1. Create round with exactly 3 players, 1 group
2. Add Stableford (all) + Six Point (within_group)
3. Score all 18 holes
4. Verify both results display correctly and independently

### Cross-group: Stableford (all) + Wolf (within_group) — 8 players, 2 groups

1. 8 players in 2 groups of 4
2. Stableford scope: all (global ranking), Wolf scope: within_group (per-group)
3. Score all players, make wolf decisions per group
4. Verify:
   - Stableford shows 1 leaderboard with all 8 players
   - Wolf shows 2 independent game results (one per group)

## Done When

- All tests pass with `yarn test:e2e`
- At least 4 stacking combinations are tested
- Competitions operate independently without interfering with each other
- NTP contributor correctly modifies only the stableford total, not other competition results
