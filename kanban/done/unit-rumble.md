# Unit Tests: Rumble Engine

## What

Write unit tests for `src/lib/domain/rumble.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/rumble.test.ts`.

Rumble is a within-group team format where all 4 players in a group are from the same team. On each hole, the players are ranked 1st–4th by stableford score and points allocated progressively: best = 4 pts, 2nd = 3 pts, 3rd = 2 pts, 4th = 1 pt. Team totals are accumulated and compared across groups.

**Scenarios to cover:**

### Per-hole point allocation

- 4 distinct stableford scores → 4/3/2/1 distribution
- Verify the player with the highest stableford gets 4, the lowest gets 1

### Tie handling within a hole

- All 4 players score the same → points split equally: (4+3+2+1)/4 = 2.5 each
- Two players tie for 1st → each gets (4+3)/2 = 3.5, others get 2 and 1
- Two players tie for 3rd → top two get 4 and 3, tying players each get (2+1)/2 = 1.5
- Three players tie for 2nd → top player gets 4, tying three each get (3+2+1)/3 = 2
- All four tied for last (0 stableford) → equal split

### Accumulation over 18 holes

- Each player's total is the sum of their per-hole allocations
- Verify group total = sum of all player totals for that group

### Team comparison

- Two groups, each from a different team → team with higher group total wins
- Equal group totals → tied result

### Missing scores

- Player with no score on a hole → what happens? (Likely treated as 0 stableford, gets last place on that hole — verify the actual behaviour)

## Done When

- All tests pass with `yarn test`
- All tie-splitting variants are tested
- Team total comparison is tested
- Missing-score behaviour is explicitly verified against the implementation
