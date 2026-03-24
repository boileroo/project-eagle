# Unit Tests: Six Point Engine

## What

Write unit tests for `src/lib/domain/six-point.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/six-point.test.ts`.

Six Point is a 3-player game where 6 points are distributed on each hole based on relative scores. The scoring basis can be stableford or gross strokes.

**Scenarios to cover:**

### Standard distribution (no ties)

- Player A scores best, B second, C third → 4 / 2 / 0
- Points are assigned by rank, not absolute value

### All three players tie

- A, B, C all score the same → 2 / 2 / 2

### Two players tie for 1st, one 3rd

- A and B tie for best, C scores worst → 3 / 3 / 0
- Verify the tied players each receive (4+2)/2 = 3

### Two players tie for 2nd (last two tie)

- A scores best, B and C tie → 4 / 1 / 1
- Verify the tied players each receive (2+0)/2 = 1

### Stableford basis

- Points awarded based on stableford scores: highest stableford = 1st
- Equal stableford → tie handling as above

### Gross basis

- Points awarded based on gross strokes: lowest gross = 1st
- Equal gross → tie handling as above

### Missing scores

- One player has no score for a hole → what happens? (Verify against implementation — likely treated as 0 stableford / very high gross)

### Accumulation over 18 holes

- Each player's total is sum of per-hole points
- Verify total across all 3 players = 6 × holes_played

### Ranking

- Players ranked by total points (descending)
- Ties → same rank

## Done When

- All tests pass with `yarn test`
- All four tie variants (no tie, all tie, 2-way tie for 1st, 2-way tie for last) are tested
- Both stableford and gross scoring bases are tested
- Total-points invariant (6 × holes) is asserted
