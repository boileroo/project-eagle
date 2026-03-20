# E2E Tests: Groups & Scope (S7)

## What

Playwright E2E tests for group assignment and competition scope (all vs within_group).

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/groups.spec.ts`.

**Test cases:**

### Auto-assign groups — even split

1. Create round with 8 players, select auto-assign with group size 4
2. Verify 2 groups of 4 are created
3. Verify all 8 players are assigned to a group (none left out)

### Auto-assign groups — uneven split

1. Create round with 7 players, auto-assign with group size 4
2. Verify groups of 4 + 3 are created

### Scope: all — single leaderboard

1. 8 players in 2 groups of 4, Stableford competition with `scope: all`
2. Enter distinct scores for all 8 players
3. Finalize and verify:
   - A single leaderboard contains all 8 players
   - Rankings are global (best stableford across all groups = rank 1)

### Scope: within_group — separate leaderboards

1. Same 8 players, same groups, but Stableford with `scope: within_group`
2. Finalize and verify:
   - Two separate leaderboards appear (one per group)
   - The top-ranked player in group 2 does not compete with the top-ranked player in group 1
   - A player's rank only reflects their performance within their own group

### Mixed scope (one all + one within_group on the same round)

1. Add both a Stableford (scope: all) and a Wolf (scope: within_group) to the same round with 8 players in 2 groups
2. Verify the stableford leaderboard is global, while wolf results are per-group

### Groups are round-level (not tournament-level)

1. Create a tournament with 2 rounds
2. Assign groups differently in R1 vs R2
3. Verify that the R1 group assignments do not affect R2

## Done When

- All tests pass with `yarn test:e2e`
- Even and uneven auto-assign are tested
- Both scope values produce the correct leaderboard structure
- Round-level independence of group assignments is verified
