# Unit Tests: Wolf Engine

## What

Write unit tests for `src/lib/domain/wolf.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/wolf.test.ts`.

**Scenarios to cover:**

### Wolf rotation

- Hole 1 → player at index 0 is wolf
- Hole 2 → player at index 1 is wolf
- Hole 5 → player at index 0 is wolf (wraps)
- Hole 18 → player at index 1 is wolf (18 mod 4 = 2 → index 1, verify)

### Partner selection

- Wolf picks a partner → 2v2 match for that hole
- Wolf picks no partner (lone wolf) → 1v3

### Lone wolf wins (1v3)

- Wolf's stableford > all opponents → wolf gets 4 pts, opponents get 0

### Lone wolf loses (1v3)

- Any opponent's stableford > wolf's → wolf gets 0, each opponent gets 2 pts

### Partnered wolf wins (2v2)

- Wolf side best > opposing side best → wolf gets 2, partner gets 2, opponents get 0

### Partnered wolf loses (2v2)

- Opposing side best > wolf side best → opponents get 2 each, wolf and partner get 0

### Tie on a hole

- Wolf side best = opposing side best → no points awarded to anyone

### Missing scores (not all 4 players scored)

- At least one player has no score → hole is `not_played`, no points awarded

### Running totals

- Track each player's cumulative points across all 18 holes
- Verify the player who won most holes has the highest total

### Decision map

- Multiple `gameDecisions` entries for the same hole → last one wins (deduplication)
- Decision references a player not in the group → treated as lone wolf (invalid partner)

### Ranking

- Players ranked by total points (descending)
- Ties → same rank

## Done When

- All tests pass with `yarn test`
- All four outcome types (lone wolf wins/loses, partnered wins/loses, tie) are tested
- Rotation logic is tested for all 18 holes
- Decision deduplication is tested
