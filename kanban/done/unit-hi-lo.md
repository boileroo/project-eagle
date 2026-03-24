# Unit Tests: Hi-Lo Engine

## What

Write unit tests for `src/lib/domain/hi-lo.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/hi-lo.ts.test.ts` → `src/lib/domain/hi-lo.test.ts`.

Hi-Lo is a 2v2 team match with **two sub-matches per hole**: best ball (high ball) and worst ball (low ball). Two points are available per hole.

**Scenarios to cover:**

### Sub-match outcomes (single hole)

Given Team A (P1, P2) vs Team B (P3, P4) where P1 > P2 and P3 > P4 in stableford:

- High ball: max(P1, P2) vs max(P3, P4) → winner gets 1 pt
- Low ball: min(P1, P2) vs min(P3, P4) → winner gets 1 pt
- Verify Team A can win both, lose both, or split (1 each)

### Tie in a sub-match

- High ball: both teams' best = 3 → sub-match halved (0.5 each)
- Low ball: both teams' worst = 1 → sub-match halved (0.5 each)

### Missing scores

- One player on Team A has no score → that player contributes 0 to both high and low for Team A
- Both players on Team A have no score → Team A contributes 0 to both sub-matches (hole effectively conceded)
- Per the testing guide: if not all 4 players have a score, the hole should be skipped entirely — verify this behaviour

### Running totals

- After 9 holes: Team A has won 6 pts, Team B has won 3 pts (half points included) → totals correct
- Final after 18 holes → correct winner

### Points accumulation

- Verify half-point handling (ties) adds correctly (e.g. 0.5 + 0.5 = 1.0)

## Done When

- All tests pass with `yarn test`
- Both sub-match calculations are tested independently
- Missing-score / skip-hole behaviour is tested
- Tie (half-point) accumulation is tested
