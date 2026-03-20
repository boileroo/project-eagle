# E2E Tests: Best Ball (S8)

## What

Playwright E2E tests for the Best Ball team competition.

## Context

Depends on `test-infra-e2e-helpers` being complete.

Tests live at `e2e/best-ball.spec.ts`.

**Setup:**

- Single standalone round
- 4 players, 2 teams (2+2), 1 group of 4, Best Ball (scope: within_group)

**Test cases:**

### Teams setup

1. Enable teams on the round/tournament
2. Create Team A and Team B
3. Assign 2 players to each team
4. Add Best Ball competition — verify it is available only when teams are enabled

### Best ball per hole

1. Enter scores so Team A's best stableford beats Team B's best on hole 1
2. Verify Team A wins hole 1
3. Enter scores so Team B wins hole 2
4. Enter scores so both teams have equal best stableford on hole 3 → halved
5. Verify running match status after each hole

### Missing scores — one team member absent

1. On a specific hole, only record a score for one of Team A's two players
2. Verify Team A uses the available player's score as their best
3. Verify no error is thrown and the hole resolves correctly

### Missing scores — both team members absent

1. On a hole, neither Team B player has a score entered
2. Verify Team B contributes 0 for that hole → hole halved if Team A also contributes 0, or Team A wins if they have any score

### Full match result

1. Score all 18 holes with a scripted outcome (e.g. Team A wins 10 holes, Team B wins 5, 3 halved)
2. Finalize and verify the match result shows Team A winning 5 up or equivalent

### All square after 18

1. Script scores so the match ends all square
2. Verify the result is shown as halved / A/S

## Done When

- All tests pass with `yarn test:e2e`
- Teams are correctly set up through the UI
- Hole-by-hole match status is verified
- Both missing-score edge cases are tested
- Final result is verified
