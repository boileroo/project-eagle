# Unit Tests: Chair Engine

## What

Write unit tests for `src/lib/domain/chair.ts`.

## Context

Depends on `test-infra-vitest` being complete.

Tests live at `src/lib/domain/chair.test.ts`.

Chair is a 4-player game. A player "holds the chair". The chair holder earns points for each hole they remain on the chair. To take the chair, you must score better than the current holder. Ties do not change the chair.

**Scenarios to cover:**

### Hole 1 — no current holder

- One player scores best → that player takes the chair (1 pt to them? or 0 on the take hole? — verify implementation)
- All 4 players tie on hole 1 → chair remains vacant, no points awarded

### Chair changes

- Player A holds chair; player B scores higher → B takes the chair
- Player A holds chair; player B scores higher; player C scores even higher → chair goes to C (highest wins)
- Verify only the player who takes the chair receives points for the takeover hole (or verify the actual rule implemented)

### Chair holder retains

- Player A holds chair; player B ties A's score → A retains, no change
- Player A holds chair; all players score lower than A → A retains, A earns points for that hole

### Chair holder scoring

- Chair holder earns 1 point for each hole they successfully defend (score matches or exceeds challengers)
- Verify point accumulation is correct over a known 18-hole sequence

### All players tie when chair is held

- A holds chair; all 4 players (including A) score the same → A retains, points logic verified

### All players tie when chair is vacant

- No current holder; all 4 players score the same → chair stays vacant, 0 pts awarded

### Accumulation over 18 holes

- A player who holds the chair for 10 consecutive holes accumulates the correct total

### Ranking

- Players ranked by total chair points (descending)
- Ties → same rank

## Done When

- All tests pass with `yarn test`
- Chair vacancy on hole 1 is tested
- Tie-retention rule is tested
- All-tie-when-vacant is tested
- Multi-hole accumulation is tested
