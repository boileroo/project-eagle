# Unit Tests: Stableford Engine

## What

Write unit tests for `src/lib/domain/stableford.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/stableford.test.ts`.

**Functions to test:**

### `stablefordPoints(grossStrokes, par, handicapAdjustment)`

| Scenario                                           | Input                  | Expected  |
| -------------------------------------------------- | ---------------------- | --------- |
| Double bogey                                       | gross=6, par=4, adj=0  | 0         |
| Bogey                                              | gross=5, par=4, adj=0  | 1         |
| Par                                                | gross=4, par=4, adj=0  | 2         |
| Birdie                                             | gross=3, par=4, adj=0  | 3         |
| Eagle                                              | gross=2, par=4, adj=0  | 4         |
| Albatross                                          | gross=1, par=4, adj=0  | 5         |
| Hole-in-one on par 3                               | gross=1, par=3, adj=0  | 4 (eagle) |
| Very high score (e.g. 12 on par 3)                 | gross=12, par=3, adj=0 | 0         |
| Handicap adjustment converts bogey to par          | gross=5, par=4, adj=1  | 2         |
| Handicap adjustment converts double bogey to bogey | gross=6, par=4, adj=1  | 1         |
| Scratch golfer (adj=0)                             | gross=4, par=4, adj=0  | 2         |
| Plus golfer (negative adj, e.g. adj=-1)            | gross=4, par=4, adj=-1 | 1         |
| High handicap (adj=2) converts double bogey to par | gross=6, par=4, adj=2  | 2         |

### `buildScoreLookup(scores)`

- Empty scores array → empty map
- Single score entry → `"participantId:holeNumber"` key present with correct value
- Multiple scores for same participant, different holes → all present
- Multiple participants → keys don't collide

### `calculateStableford(input)`

Build a `CompetitionInput` with known data and verify:

- 4 players, all pars, handicap 0 → all get 2 pts × 18 holes = 36 pts each
- Players are ranked by total stableford (descending)
- Ties in stableford → same rank assigned
- Player with no scores on any hole → 0 pts, holesCompleted = 0
- Player with partial scores (9 holes) → only those holes counted
- `grossTotal` and `netTotal` accumulate correctly
- `holesCompleted` reflects only holes with a score

## Done When

- All tests pass with `yarn test`
- All branches in `stableford.ts` are covered
- Test file documents the expected point table clearly as comments
