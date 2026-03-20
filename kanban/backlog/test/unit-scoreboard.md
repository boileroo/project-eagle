# Unit Tests: Scoreboard & Leaderboard

## What

Write unit tests for `src/lib/domain/individual-scoreboard.ts` and `src/lib/domain/tournament-leaderboard.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at:

- `src/lib/domain/individual-scoreboard.test.ts`
- `src/lib/domain/tournament-leaderboard.test.ts`

**Individual Scoreboard (`individual-scoreboard.ts`)**

The scoreboard aggregates a player's gross, net, and stableford totals for a single round and applies any contributor bonus points.

Scenarios:

- Scoreboard shows correct gross, net, and stableford columns for all players
- Contributor bonus adds to the `total` column (stableford + bonus)
- Standalone bonus appears as a badge only — does not change total
- Player with no scores → all totals are 0 / null as appropriate
- Player with partial scores → only scored holes counted
- Multiple bonus competitions: each contributor bonus accumulates correctly
- `primaryScoringBasis: 'net_strokes'` → net strokes highlighted / used as primary sort

**Tournament Leaderboard (`tournament-leaderboard.ts`)**

The leaderboard aggregates results across multiple rounds for a tournament.

Scenarios:

- Two rounds, both finalized → totals summed correctly
- One round finalized, one pending → pending round shown as `pending`, excluded from total
- Player absent from one round → absent round excluded (not zeroed)
- Player with incomplete scores in one round → that round marked `incomplete`, excluded from total
- Correct ranking after aggregation
- Aggregation method `sum_stableford`: sum of stableford from all rounds
- Aggregation method `lowest_strokes`: sum of net strokes (lower is better → ranking is ascending)
- Aggregation method `match_wins`: count of match wins / halves across rounds
- Tiebreaker: verify gross strokes used as tiebreaker when stableford totals are equal

## Done When

- All tests pass with `yarn test`
- All three aggregation methods are tested
- Absent and incomplete player states are tested
- Bonus contribution to scoreboard total is tested
