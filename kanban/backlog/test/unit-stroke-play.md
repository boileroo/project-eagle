# Unit Tests: Stroke Play Engine

## What

Write unit tests for `src/lib/domain/stroke-play.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/stroke-play.test.ts`.

**Scenarios to cover:**

### Gross strokes ranking

- 4 players with different gross totals → ranked lowest-first
- Player with all pars on a par-72 course → gross total = 72
- Player with partial scores → gross total is sum of scored holes only, `holesCompleted` reflects actual count

### Net strokes ranking

- Net = gross − total handicap strokes received
- Handicap 18 on par-72: each hole SI 1–18 gets 1 stroke → net = gross − 18
- Handicap 36: each hole gets 2 strokes → net = gross − 36
- Scratch golfer (handicap 0): net = gross

### Tiebreaker behaviour

- Two players with same net total → same rank (tied)
- Tiebreaker via gross (if implemented): verify whichever player has lower gross gets the better rank

### Ranking

- 4 players ranked correctly 1st through 4th
- All players tied → all rank 1

### Per-hole net strokes

- Each hole shows the correct `handicapAdjustment` based on hole stroke index and player handicap
- Net strokes per hole = gross − adjustment

## Done When

- All tests pass with `yarn test`
- Both gross and net paths are tested
- Handicap allocation logic is verified at the hole level
