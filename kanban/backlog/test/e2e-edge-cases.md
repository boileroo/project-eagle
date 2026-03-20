# E2E Tests: Edge Cases

## What

Playwright E2E tests covering participant, handicap, scoring, and group/team edge cases from the testing guide.

## Context

Depends on `test-infra-e2e-helpers` and the core format E2E tests being complete. These tests are best run as a final pass once the main scenarios are stable.

Tests live at `e2e/edge-cases.spec.ts`.

---

## Participants

### Guest player (no user account)

1. Add a guest (person without a registered account) to a round
2. Enter scores for the guest
3. Finalize and verify the guest appears on the scoreboard with correct scores

### Marker

1. Add a player with `isMarker=true` to a group
2. Open live scoring — verify the marker can record scores for other players in the group
3. Finalize and verify the marker does NOT appear on the scoreboard or leaderboard

### Handicap override — tournament level

1. A player has a profile handicap of 18
2. Set a tournament-level handicap override of 14 for that player
3. Open a round within that tournament
4. Verify the round participant shows handicap 14, and net strokes / stableford points reflect 14

### Handicap override — round level takes precedence

1. Same player with tournament override of 14
2. Set a round-level override of 10 for the same player
3. Verify the round uses handicap 10 (round override wins)

### Scratch golfer (handicap 0)

1. Player with handicap 0 plays a round
2. Verify no stroke index adjustments are applied — net = gross on every hole
3. Verify stableford points are calculated against par only

### High handicap (36+)

1. Player with handicap 36 plays a round
2. Verify holes with SI 1–18 receive 2 strokes; any remaining holes receive 1 stroke (per handicap allocation rules)
3. Verify stableford points reflect the double-stroke adjustment

### Negative handicap (plus golfer, e.g. −2)

1. Player with handicap −2 plays a round
2. Verify the two lowest SI holes receive −1 stroke adjustment (strokes removed)
3. Verify stableford calculation reflects the negative adjustment (harder to score points)

---

## Scoring

### Score correction

1. Enter a score of 5 for player A on hole 3
2. Re-enter hole 3 for player A with a score of 4 (correction)
3. Verify the scoreboard uses 4, not 5 — the latest entry wins

### Very high score

1. Enter 12 strokes on a par 3 for a scratch golfer
2. Verify stableford points = 0 for that hole
3. Verify gross strokes still show 12 on the scorecard

### Hole-in-one

1. Enter 1 stroke on a par 3 for a handicap-18 player (hole SI 1 → 1 extra stroke)
2. Verify stableford = 4 pts (eagle net) + 1 handicap stroke = net −2 → 4 pts (eagle = 4)
3. Verify the scorecard highlights the hole-in-one

---

## Groups

### Player unassigned to any group

1. Create a round with 5 players; assign 4 to a group, leave 1 unassigned
2. Add a Wolf competition (within_group)
3. Verify the unassigned player is excluded from the Wolf game
4. Verify the unassigned player still appears on the Stableford scoreboard if a Stableford (all) competition is also present

---

## Teams

### Player not on any team with team competition

1. Create 5 players with 2 teams (2+2), leaving 1 teamless
2. Add Best Ball competition
3. Verify the teamless player is excluded from the Best Ball match
4. Verify the teamless player still appears on any individual competition

### 3+ teams

1. Create a tournament with 3 teams (4+4+4), 3 groups (one per team), Rumble competition
2. Verify all 3 groups can be scored
3. Verify all 3 team totals are calculated and the winning team is identified

## Done When

- All tests pass with `yarn test:e2e`
- All participant edge cases (guest, marker, handicap variants) are tested
- Score correction is tested
- Extreme scores (hole-in-one, very high) are verified
- Unassigned player and teamless player exclusion are tested
- 3-team tournament is tested
