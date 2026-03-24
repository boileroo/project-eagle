# Unit Tests: Best Ball Engine

## What

Write unit tests for `src/lib/domain/best-ball.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/best-ball.test.ts`.

Best Ball is a 2v2 team match where each team's best stableford score per hole is used.

**Scenarios to cover:**

### Best score selection per hole

- Team A: player 1 scores 3 pts, player 2 scores 1 pt → team best = 3
- Team A: player 1 scores 0 pts, player 2 scores 4 pts → team best = 4
- Both players on same team score the same → team best = that value

### Hole outcome

- Team A best > Team B best → Team A wins hole
- Team B best > Team A best → Team B wins hole
- Team A best = Team B best → hole halved

### Missing scores

- One player on a team has no score for a hole, the other does → team best = the available score
- Both players on a team have no score → team score = 0 for that hole → hole is halved (0v0)

### Running match result

- Team A wins 3 holes, Team B wins 2, 1 halved after 6 holes → Team A 1 up
- Match clinched early (e.g. Team A is 3 up with 2 to play) → result stands, remaining holes don't change outcome

### Final result

- Team A wins 3&2 → correct result label
- All square after 18 → halved
- Match going to 19+ holes (if overtime is modelled) — or confirm it is halved at A/S

### Points distribution

- Winning team receives correct points based on competition config
- Halved match distributes half points to each side

## Done When

- All tests pass with `yarn test`
- Missing-score edge cases (one player, no players) are explicitly tested
- Early conclusion is tested
