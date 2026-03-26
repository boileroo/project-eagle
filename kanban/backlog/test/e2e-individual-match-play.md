# E2E Tests: Individual Match Play (S2)

## What

Playwright E2E tests for individual (no teams) match play using the new `+ Match` button.

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/individual-match-play.spec.ts`.

The `+ Match` button is enabled only when `hasTeams` is false. It creates a `match_play` competition with `groupScope: 'all'`, allowing any two players in the round to be paired regardless of groups.

**Setup:**

- Single standalone round, no teams
- Use `+ Match` button (not `+ Team Match`)

**Test cases:**

### Basic: 2 players, no group, explicit pairing

1. Create round with 2 players, no group, add Match Play via `+ Match`
2. Open pairings tab — verify a single match is shown
3. Pair the two players, enter scores, finalize
4. Verify result is correct

### 4 players, no group, 2 explicit pairings

1. Create round with 4 players (no groups), add Match Play via `+ Match`
2. Open pairings tab — manually pair 1v2 and 3v4
3. Enter scores to drive known outcomes
4. Finalize and verify both match results are correct

### Only one match play competition allowed per round

1. Add a Match Play via `+ Match`
2. Open `+ Match` dialog again — verify "already exists" warning is shown and Create button is disabled

### `+ Match` disabled when teams are enabled

1. Enable teams on the tournament
2. Open the round — verify `+ Match` button is disabled
3. Verify `+ Team Match` is now enabled

## Done When

- All tests pass with `yarn test:e2e`
- Manual pairing flow is covered
- Duplicate-guard is verified
- Button state (enabled/disabled based on `hasTeams`) is verified
