# E2E Tests: Hi-Lo (S9)

## What

Playwright E2E tests for the Hi-Lo team competition.

## Context

Depends on `test-infra-e2e-helpers` and `e2e-best-ball` (teams setup pattern) being complete.

Tests live at `e2e/hi-lo.spec.ts`.

**Setup:**

- Single standalone round
- 4 players, 2 teams (2+2), 1 group of 4, Hi-Lo (scope: within_group)

**Test cases:**

### Both sub-matches resolve independently

On a single hole where scores are (Team A: P1=3, P2=1) vs (Team B: P3=4, P4=2):

- High ball: max(3,1)=3 vs max(4,2)=4 → Team B wins high ball (1 pt)
- Low ball: min(3,1)=1 vs min(4,2)=2 → Team A wins low ball (1 pt)
- Hole is split 1-1
- Verify the running score reflects the split

### Team A wins both sub-matches

On a hole where Team A has higher best AND lower worst than Team B:

- Verify Team A wins 2 pts for that hole

### Sub-match tie

On a hole where both teams' best scores are equal:

- High ball: halved (0.5 each)
- Verify half-points are applied correctly to running total

### Skipped hole (missing scores)

Based on the testing guide: if not all 4 players have a score for a hole, the hole should be skipped:

- Enter scores for only 3 of the 4 players on a hole
- Verify that hole does not contribute to either team's total

### Running totals over 18 holes

1. Script 18 holes with a known mix of Team A wins, Team B wins, and splits
2. Finalize and verify totals match the expected outcome

## Done When

- All tests pass with `yarn test:e2e`
- Both sub-matches per hole are independently verified
- Tie (half-point) handling is tested
- Skipped-hole (missing score) behaviour is tested
- Running totals are verified against a scripted 18-hole sequence
