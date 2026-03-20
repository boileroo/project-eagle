# Unit Tests: Standings & Rank Engine

## What

Write unit tests for `src/lib/domain/standings.ts` and `src/lib/domain/rank.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at:

- `src/lib/domain/standings.test.ts`
- `src/lib/domain/rank.ts` (likely already covered by other tests; add explicit tests here)

**`rank.ts` — `assignRanks`**

- 4 players with distinct scores → ranks 1, 2, 3, 4
- 2 players tied for 1st → both rank 1; next player ranks 3 (skips 2)
- 2 players tied for 2nd → both rank 2; next player ranks 4 (skips 3)
- All 4 players tied → all rank 1
- Single player → rank 1
- Empty array → no error

**`standings.ts` — Tournament standings aggregation**

`sum_stableford` aggregation:

- Player scores 32 in R1, 28 in R2 → standing total = 60
- Player absent in R1 → only R2 counts; total = R2 stableford
- Player absent in both rounds → total = 0 (or excluded — verify)

`lowest_strokes` aggregation:

- Player shoots 74 gross in R1, 76 in R2 → total = 150; ranked ascending
- Net version: player receives 18 strokes per round; net = gross − 18 per round

`match_wins` aggregation:

- Player wins R1 match, loses R2 match → standing = 1 win
- Halved match counts as 0.5 wins → standing = 0.5
- Player absent in R1 → only R2 wins count

Ranking:

- `sum_stableford` and `match_wins`: highest total = rank 1
- `lowest_strokes`: lowest total = rank 1
- Ties → same rank, next rank skipped

## Done When

- All tests pass with `yarn test`
- All three aggregation methods are tested
- Absent-player handling is verified for each method
- Rank tie / skip behaviour is explicitly tested
