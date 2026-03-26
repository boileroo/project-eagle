# Testing Guide

Work through the scenarios in order — each one builds on the last. Check off as you go.

---

## Format Quick Reference

| Format      | Players per group | Needs teams | Notes                           |
| ----------- | ----------------- | ----------- | ------------------------------- |
| Stableford  | 1+                | No          | Any count                       |
| Stroke Play | 1+                | No          | Any count; gross or net         |
| Match Play  | 2+ (even)         | No          | Pairs; auto or explicit         |
| Best Ball   | 4 (2v2)           | Yes         | Team match, best score per hole |
| Hi-Lo       | 4 (2v2)           | Yes         | Two sub-matches per hole        |
| Rumble      | 4                 | Yes         | All 4 in group from same team   |
| Wolf        | Exactly 4         | No          | Per-group only                  |
| Six Point   | Exactly 3         | No          | Per-group only                  |
| Chair       | Exactly 4         | No          | Per-group only                  |

---

## Phase 1: Individual Formats (No Teams, Single Group)

### S1 — Stableford Baseline

**Setup:** Single round · 4 players · 1 group · Stableford (scope: all)

- [ ] Create round, add 4 players to 1 group, add Stableford competition
- [ ] Open round, enter all 18 hole scores for all players
- [ ] Finalize round
- [ ] Scoreboard shows gross, net, and stableford for each player
- [ ] Players ranked correctly by stableford (gross as tiebreaker)

### S2 — Match Play

**Setup:** Single round · 4 players · 1 group · Match Play (scope: within_group)

- [ ] Players auto-paired: 1v2 and 3v4
- [ ] Hole-by-hole status updates correctly (e.g. "A/S", "1 up")
- [ ] Final result shows correct outcome (e.g. 2&1, A/S)
- [ ] Score a match so one side clinches early — remaining holes should not change the result

**Also:** 2 players · 1 group — explicit single pairing, verify same result logic

### S3 — Six Point

**Setup:** Single round · 3 players · 1 group · Six Point (scope: within_group)

- [ ] Outright winner on a hole: 4 / 2 / 0 distribution
- [ ] All 3 tie on a hole: 2 / 2 / 2 distribution
- [ ] Two players tie for 1st: 3 / 3 / 0 distribution
- [ ] Running totals correct after all 18 holes

**Also test gross basis:** same setup, change scoring to gross strokes

### S4 — Wolf

**Setup:** Single round · 4 players · 1 group · Wolf (scope: within_group)

- [ ] Player order rotates each hole (wolf = last to pick on their hole)
- [ ] Partner pick: wolf chooses partner → 2v2 resolves correctly
- [ ] Lone wolf wins: wolf gets 4 pts, all opponents get 0
- [ ] Lone wolf loses: each opponent gets 2 pts
- [ ] Totals correct after 18 holes

### S5 — Chair

**Setup:** Single round · 4 players · 1 group · Chair (scope: within_group)

- [ ] Hole 1: best stableford score takes the chair
- [ ] Subsequent holes: must beat chair holder to take the chair
- [ ] Tie when chair is held: holder retains, no points change hands
- [ ] All players tie on hole 1 (no holder yet): chair stays vacant
- [ ] Points accumulate correctly over all holes

---

## Phase 2: Multiple Groups & Scope

### S6 — Groups

**Setup:** Single round · 8 players · 2 groups of 4 · no game competitions

- [ ] Auto-assign 8 players into 2 groups of 4 (even split)
- [ ] Single leaderboard (gross/net/stableford) ranks all 8 players together
- [ ] Uneven auto-assign: 7 players → groups of 4 + 3
- [ ] Different group compositions in R1 vs R2 of the same tournament work independently

### S7 — Groups + Wolf

**Setup:** Single round · 8 players · 2 groups of 4 · Wolf (scope: within_group)

- [ ] Wolf runs independently inside each group — two separate Wolf results
- [ ] Players in group 1 do not appear in group 2's Wolf leaderboard and vice versa
- [ ] Points totals correct per group

### S8 — Groups + Six Point

**Setup:** Single round · 6 players · 2 groups of 3 · Six Point (scope: within_group)

- [ ] Six Point runs independently inside each 3-player group
- [ ] Each group produces its own separate result
- [ ] Players in one group do not affect the other group's distribution

### S9 — Groups + Match Play

**Setup:** Single round · 8 players · 2 groups of 4 · Match Play (scope: within_group)

- [ ] Two matches per group (4 matches total across the round)
- [ ] Each group's matches are independent — results do not bleed across groups
- [ ] Pairings within each group resolve correctly

### S10 — Groups + Mixed

**Setup:** Single round · 8 players · 2 groups of 4 · Wolf (within_group) + NTP hole 7 (all)

- [ ] Wolf produces a separate result per group (within_group)
- [ ] NTP produces a single result spanning all 8 players (all)
- [ ] Both competitions coexist on the same round without interference

### S11 — Groups + Different Games

**Setup:** Single round · 8 players · 2 groups of 4 · Wolf in group 1, Chair in group 2 (both within_group)

- [ ] Group 1 runs Wolf; group 2 runs Chair — different game types in the same round
- [ ] Wolf result only covers group 1 players; Chair result only covers group 2 players
- [ ] Neither game's result is influenced by the other group's scores

---

## Phase 3: Team Formats

### S12 — Best Ball

**Setup:** Single round · 4 players · 2 teams (2+2) · 1 group · Best Ball (scope: within_group)

- [ ] Each team's best stableford score per hole is used
- [ ] Hole-by-hole match result is correct
- [ ] Final match score correct (e.g. Team A wins 3&2)
- [ ] One team member missing a score on a hole: the other member's score counts
- [ ] Both team members missing a score on a hole: hole is halved (0 vs 0)

### S13 — Hi-Lo

**Setup:** Single round · 4 players · 2 teams (2+2) · 1 group · Hi-Lo (scope: within_group)

- [ ] Per hole: best-ball sub-match and worst-ball sub-match are evaluated separately (2 pts available per hole)
- [ ] Both sub-matches resolve correctly when all 4 players have scores
- [ ] A sub-match where both sides tie: halved
- [ ] Running totals and final result correct

### S14 — Rumble

**Setup:** Single round · 8 players · 2 teams (4+4) · 2 groups of 4 · Rumble (scope: within_group)

> Each group must be all from the same team — group 1 = Team A, group 2 = Team B.

- [ ] Within each group, per-hole progressive scoring: best = 4 pts, 2nd = 3, 3rd = 2, 4th = 1
- [ ] Each player's contribution accumulates correctly over 18 holes
- [ ] Team totals compared correctly at the end

---

## Phase 4: Bonus Competitions

### S15 — NTP and LD

Add these onto any existing round from above.

**Nearest Pin (NTP):**

- [ ] Standalone: award to a player → badge shown, score unchanged
- [ ] Contributor (1 pt): award → that player's total increases by 1
- [ ] Contributor (2 pts): award → total increases by 2
- [ ] Multiple NTPs on different holes: each awarded and counted independently

**Longest Drive (LD):**

- [ ] Standalone: badge shown, score unchanged
- [ ] Contributor (1 pt): awarded player's total increases by 1

---

## Phase 5: Multi-Format Rounds

### S16 — Multi-Format

**Setup:** Single round · 4 players · 1 group · Wolf (within_group) + NTP contributor (hole 7)

- [ ] Both competitions exist on the same round
- [ ] Wolf operates independently within the group
- [ ] NTP award adds correctly to the winner's stableford total
- [ ] Scoreboard totals reflect the bonus

**Also test:** Stableford + Chair on the same round — individual ranking alongside the group game

**And:** Stableford + Best Ball + NTP (standalone) with teams enabled — individual comp, team match, and badge all coexist

---

## Phase 6: Tournament Lifecycle

### S17 — Two-Round Individual Tournament

**Setup:** Tournament · 2 rounds · 6 players · No teams · Stableford per round · Aggregation: sum_stableford

- [ ] Create tournament with 2 rounds
- [ ] Add 6 participants to tournament → verify auto-added to both rounds
- [ ] Add a new draft round → verify it inherits all tournament participants
- [ ] Lock tournament → both rounds move to `scheduled`
- [ ] Unlock tournament → both rounds revert to `draft`
- [ ] Re-lock → open R1 → score all players → finalize R1
- [ ] Attempt to open R2 before R1 is finalized → should be blocked
- [ ] Open R2 → score (leave one player absent) → finalize R2
- [ ] Attempt to reopen R1 while R2 is open → should be blocked
- [ ] Finalize R2 → tournament status becomes `complete`
- [ ] Reopen R2 for a correction → tournament status returns to `underway`, R2 status returns to `open`

**Tournament leaderboard:**

- [ ] Aggregates stableford totals from both rounds correctly
- [ ] Absent player's R2 is excluded, not zeroed
- [ ] Players with incomplete scores in a round show as `incomplete`, excluded from that round's contribution
- [ ] Leaderboard with only R1 finalized shows R2 as `pending`

### S18 — Two-Round Team Tournament

**Setup:** Tournament · 2 rounds · 8 players · 2 teams (4+4) · 2 groups of 4 per round (2 per team per group) · Stableford (all) + Best Ball (within_group) per round · Aggregation: match_wins (Best Ball) + sum_stableford (individual)

- [ ] Create tournament, enable teams, assign 4 players to each team
- [ ] Create groups with 2 players from each team per group
- [ ] Add Stableford + Best Ball to both rounds
- [ ] Full lifecycle: lock → open R1 → score → finalize R1 → open R2 → score → finalize R2
- [ ] Per-round Best Ball match results are correct
- [ ] Individual stableford leaderboard aggregates correctly across both rounds
- [ ] Team match wins aggregate correctly across both rounds

---

## Edge Case Checklist

Work through these alongside the scenarios above or as a final pass.

### Participants & Handicaps

- [ ] Guest player (no user account) can be added to a round and scores recorded
- [ ] Marker (`isMarker=true`) can record scores for others but does not appear on the leaderboard
- [ ] Handicap override set at tournament level cascades to the round participant
- [ ] Handicap override set at round level takes precedence over the tournament-level value
- [ ] Handicap 0 (scratch): no stroke index adjustments applied
- [ ] Handicap 36+: multiple strokes allocated on some holes
- [ ] Negative handicap (e.g. −2): correct negative stableford adjustments

### Scoring

- [ ] Score correction: entering a new score for the same (player, hole) replaces the previous value
- [ ] Very high score (e.g. 12 on a par 3): 0 stableford points, gross value still recorded
- [ ] Hole-in-one on a par 3: eagle = 4 stableford points + any handicap strokes added

### Groups

- [ ] Player not assigned to any group is excluded from within_group competitions
- [ ] Auto-assign with group size = 3 (for Six Point) and group size = 2 (for Match Play) work correctly

### Teams

- [ ] Disable teams mid-setup: deletes teams and all team-format competitions
- [ ] Re-enable teams after disabling: teams must be recreated from scratch
- [ ] Move a player from Team A to Team B: auto-removed from old team
- [ ] Player not on any team with a team competition present: excluded from team results
- [ ] 3 teams in a tournament (e.g. Rumble with 3 groups of 4, one group per team)
