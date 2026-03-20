# E2E Tests: Two-Round Team Tournament (S14)

## What

Playwright E2E tests for a two-round tournament with teams, combining individual stableford and team Best Ball across both rounds.

## Context

Depends on `test-infra-e2e-helpers`, `e2e-best-ball`, and `e2e-tournament-individual` being complete.

Tests live at `e2e/tournament-teams.spec.ts`.

**Setup:**

- Tournament with 2 rounds
- 8 players, 2 teams (4+4)
- 2 groups of 4 per round (2 players from each team per group)
- Per round: Stableford (scope: all) + Best Ball (scope: within_group)
- Aggregation: sum_stableford (individual) + match_wins (Best Ball)

**Test cases:**

### Team setup carries through to rounds

1. Enable teams at the tournament level
2. Create Team A (4 players) and Team B (4 players)
3. Verify team membership is reflected in both rounds when they are created
4. Assign groups (2 from each team per group)
5. Verify Best Ball is valid (groups have 2 players per team)

### Full tournament lifecycle

1. Lock tournament → open R1 → score all 8 players → finalize R1
2. Open R2 → score all 8 players → finalize R2
3. Verify tournament status = `complete`

### Per-round Best Ball results

1. In R1: script scores so Team A wins 3&1 in group 1 and Team B wins 2&0 in group 2
2. Verify R1 Best Ball results show the correct match outcomes per group
3. Repeat for R2 with different outcomes

### match_wins aggregation across 2 rounds

1. Define R1 and R2 outcomes so Team A wins R1 and Team B wins R2
2. Verify tournament standings show 1 match win per team (tied)
3. Define outcomes so Team A wins both rounds
4. Verify Team A has 2 match wins; Team B has 0

### Individual stableford aggregation (sum_stableford)

1. Enter known scores for all players across both rounds
2. Verify individual tournament leaderboard = R1 stableford + R2 stableford per player
3. Verify team membership does not affect individual ranking

### Team management edge cases

1. Disable teams mid-setup (before locking) → verify all team-format competitions are deleted
2. Re-enable teams → verify teams must be recreated from scratch
3. Move a player from Team A to Team B → verify they are auto-removed from Team A and the team competition still resolves correctly

## Done When

- All tests pass with `yarn test:e2e`
- Team setup and persistence across rounds is verified
- Per-round Best Ball results are verified
- match_wins aggregation across 2 rounds is tested
- Individual stableford aggregation is verified alongside team results
- Team management edge cases (disable, re-enable, move player) are tested
