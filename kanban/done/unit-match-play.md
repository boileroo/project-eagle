# Unit Tests: Match Play Engine

## What

Write unit tests for `src/lib/domain/match-play.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/match-play.test.ts`.

**Scenarios to cover:**

### Hole outcomes

- Player A scores lower net → A wins hole (1 up)
- Player B scores lower net → B wins hole (1 up)
- Equal net → hole halved, status unchanged
- Hole with no score for either player → hole not played, status unchanged

### Running match status

- Series of alternating wins → running tally is correct after each hole
- A goes 3-up after 3 holes → status = "3 up"
- B wins back two holes → status = "1 up"

### Early conclusion (dormie / clinched)

- A is 3 up with 3 to play → A wins 3&0 (or equivalent)
- A is 2 up with 1 to play (dormie) → A cannot lose
- A closes out match with 5 holes remaining → result is "5&4"; subsequent holes do not change the outcome

### All square after 18

- Both players equal after 18 holes → match is halved
- Points awarded = `pointsPerHalf` for each side (verify the config value is respected)

### Multi-match input (within_group, 4 players auto-paired)

- 4 players → two independent matches (1v2, 3v4)
- Results of match 1 do not affect match 2

### Points / result format

- Winner of a 3&1 match receives correct points
- Halved match: each side receives `pointsPerHalf`
- Verify the result label format is correct (e.g. "3&1", "A/S", "1 up")

## Done When

- All tests pass with `yarn test`
- Early-conclusion logic is specifically tested
- All-square handling is tested
- Multi-match (4-player) input is tested
