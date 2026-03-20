# E2E Tests: Two-Round Individual Tournament (S13)

## What

Playwright E2E tests for a two-round individual tournament including the full lifecycle, round sequencing guards, and leaderboard aggregation.

## Context

Depends on `test-infra-e2e-helpers` and `e2e-stableford` being complete.

Tests live at `e2e/tournament-individual.spec.ts`.

**Setup:**

- Tournament with 2 rounds, 6 players, no teams
- Stableford competition per round (scope: all)
- Aggregation: sum_stableford

**Test cases:**

### Tournament lifecycle — lock/unlock

1. Create tournament with 2 draft rounds
2. Lock the tournament → verify both rounds change to `scheduled`
3. Unlock the tournament → verify both rounds revert to `draft`

### Sequential round progression

1. Lock and then open R1 → verify only R1 is opened
2. Attempt to open R2 before R1 is finalized → verify R2 opening is blocked
3. Score all players in R1, finalize R1
4. Open R2 → verify R2 opens correctly
5. Attempt to reopen R1 while R2 is open → verify this is blocked
6. Score all players in R2, finalize R2
7. Verify tournament status becomes `complete`

### Reopen a finalized round

1. With R2 finalized and tournament complete, reopen R2
2. Verify R2 status returns to `open`
3. Verify tournament status returns to `underway` (or equivalent)
4. Finalize R2 again → tournament returns to `complete`

### Participant management

1. Add a participant to the tournament after creation
2. Verify the participant is auto-added to both draft rounds
3. Add a new draft round to an existing tournament
4. Verify the new round inherits all existing tournament participants

### Tournament leaderboard — aggregation

1. Complete both rounds with known, distinct scores
2. Verify tournament leaderboard totals = R1 stableford + R2 stableford for each player
3. Verify ranking is correct (highest combined total = rank 1)

### Absent player in R2

1. Player F is in R1 but does not play in R2 (absent from round)
2. Verify R2 shows `absent` for player F
3. Verify tournament leaderboard excludes R2 for player F (uses R1 only, not zeroed)

### Incomplete scores in a round

1. Player E scores only 9 of 18 holes in R1
2. Verify R1 shows `incomplete` for player E
3. Verify tournament leaderboard excludes that round's contribution for player E

### Leaderboard with pending round

1. With R1 finalized and R2 not yet played, view tournament leaderboard
2. Verify R1 totals appear and R2 shows as `pending`

## Done When

- All tests pass with `yarn test:e2e`
- All lifecycle state transitions (lock, unlock, open, sequential guard, finalize, reopen) are tested
- Participant auto-add behaviour is tested
- Absent and incomplete player handling is verified on the leaderboard
