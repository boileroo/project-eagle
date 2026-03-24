# Unit Tests: Bonus Engine

## What

Write unit tests for `src/lib/domain/bonus.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/bonus.test.ts`.

Bonus competitions (Nearest Pin, Longest Drive) can be either standalone or contributor. Standalone awards a badge only with no score effect. Contributor adds a fixed number of points to the winner's total in the parent competition.

**Scenarios to cover:**

### Standalone bonus

- Award given to player A → player A has the badge
- Player A's score in the parent competition is unchanged
- No other player receives a badge

### Contributor bonus (1 point)

- Award given to player A → player A's stableford total increases by 1
- Other players' totals are unchanged
- Badge is also shown on player A

### Contributor bonus (2 points)

- Award given to player A → player A's total increases by 2

### No award

- Bonus competition with no winner recorded → no score changes, no badge

### Multiple bonus competitions

- NTP on hole 7 (1 pt) and NTP on hole 14 (1 pt), same player wins both → total +2
- NTP on hole 7 won by player A, NTP on hole 14 won by player B → A +1, B +1

### Integration with parent scoreboard

- Verify that after applying contributor bonuses, the scoreboard rankings update correctly (a bonus could change who is ranked 1st)

### Type: nearest_pin vs longest_drive

- Both types follow the same standalone/contributor logic — verify both types work

## Done When

- All tests pass with `yarn test`
- Standalone (no score effect) and contributor (adds to total) are tested
- Multiple bonuses on the same player are tested
- Multiple bonuses on different players are tested
