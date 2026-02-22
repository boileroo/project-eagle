# Scoring Design

## Raw Notes (Tom)

The structure of scoring is:

A tournament with any number of players. Players are split into a number of teams.

Golf is played in rounds, and each round split into groups of up to 4 players.

Competitions are the way the winning individual and/or team of the tournament is decided from all the golf played across groups and rounds.

### Scenario 1

8 players, split into 2 teams of 4.
3 rounds in the tournament, each round consisting of 2 groups of 4 players.

**Round 1:** Irish rumble, group 1 (all 4 members of Team 1) vs group 2 (all 4 members of team 2). Commissioner decides winning team receives 2 points towards the team competition. (total of 2 points)

**Round 2:** Fourball, both groups playing 2v2 from each team, lowest stableford score across the four players wins the hole for that pairing, matchplay. Commissioner decides the winning pair of each match receives 2 points towards the team competition. (total of 4 points)

**Round 3:** Singles, each group consisting of two members of each Team, 2 matches per group. Commissioner decides winning player receives 1 point towards the team competition. (total of 8 points available).

In addition, there is an individual tournament running across all 3 rounds, best overall stableford score across all 3 rounds combined, irrespective of team aspect. The commissioner also specifies one hole for nearest the pin and one for longest drive in each round, 1 bonus stableford point awarded for each for a total of 6 bonus points available, to be added to the individual points scores.

### Scenario 2

16 players, split into 2 teams of 8.
3 rounds in the tournament, each round consisting of 4 groups of 4 players.

**Round 1:** Foursomes. Played in pairs vs pairs within each group, 2 from each Team. Winning the match is worth 1 point per match. (total of 4 points available)

**Round 2:** Fourballs. Played in pairs vs pairs within each group, 2 from each Team. Winning the match is worth 1 point per match. (total of 4 points available)

**Round 3:** Singles, each group consisting of two members of each Team, 2 matches per group. Commissioner decides winning player receives 1 point towards the team competition. (total of 8 points available).

In addition, there is an individual tournament running across all 3 rounds, best overall stableford score across all 3 rounds combined, irrespective of team aspect. There are no bonus points available.

---

## Cleansed Domain Model

### 1. Tournament

A Tournament contains:

- Players (any number)
- Teams (optional grouping of players)
- Rounds (1+)
- Competitions (0+, each round-scoped)

A tournament can run:

- Team matches (Match, Best Ball, Hi-Lo, Rumble)
- Individual games (Wolf, Six Point, Chair)
- Both simultaneously (with a warning that team leaderboard aggregation won't apply)
- Neither — Individual Scoreboard is always present regardless

### 2. Players & Teams

- A Player belongs to exactly one Team (if teams are used) and multiple Rounds
- A Team contains 1+ Players
- Teams are tournament-level only — fixed for the duration; no round-level team concept

Teams are just groupings. They don't define scoring — Competitions do.

### 3. Rounds

A Round represents one day/session of golf.

Each round contains:

- Groups (max 4 players per group)
- Individual hole scores (ScoreEvents)
- Round format label (free-text display only, e.g. "Round 1: Irish Rumble")
- `primaryScoringBasis` — commissioner-designated trophy column
- Competitions (optional — matches, games, bonuses)

**Important distinction:**

> A Round defines **how golf is played** (structural setup).
> Competitions define **how points are awarded**.
> The Individual Scoreboard is always auto-computed — it is not a competition.

### 4. Groups

A Group:

- Max 4 players
- Purely logistical (who plays together)
- Does NOT determine scoring rules — but is used by the engine to auto-derive pairings for Best Ball, Hi-Lo, and Rumble

### 5. Competition Categories

| Category  | Formats                                      | Scope               | Max per round | Requirement                |
| --------- | -------------------------------------------- | ------------------- | ------------- | -------------------------- |
| **Match** | `match_play`, `best_ball`, `hi_lo`, `rumble` | within_group or all | 1             | Tournament must have teams |
| **Game**  | `wolf`, `six_point`, `chair`                 | within_group        | 1             | None                       |
| **Bonus** | `nearest_pin`, `longest_drive`               | any                 | Unlimited     | None                       |

> `stableford` and `stroke_play` are retired format types. They are no longer available as competition options. Individual scoring is now always provided by the auto-computed Individual Scoreboard.

### 6. Individual Scoreboard (Always Present)

The Individual Scoreboard is not a competition. It requires no configuration and is always shown.

**Round-level columns:**

| Column        | Derivation                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| Gross strokes | Sum of raw stroke events                                                          |
| Net strokes   | Gross minus handicap strokes per hole                                             |
| Stableford    | 2-diff per hole, min 0, summed                                                    |
| Bonus         | `contributor` bonus points; `standalone` bonuses shown as a badge (e.g. "NTP H3") |
| Total         | Stableford + contributor bonus points (only shown if contributor bonuses exist)   |

The commissioner marks one column as the **primary scoring basis** (trophy column). Users can show/hide any column for their own view (client-side preference).

### 7. Bonus Competitions (NTP / LD)

Bonus competitions are award-based — a commissioner or marker picks the winner via a dropdown. They operate in two modes:

1. **Standalone** — records a winner, displayed as a badge in the Bonus column. No impact on point totals.
2. **Contributor** — records a winner AND adds bonus points to the winner's Bonus column (and Total column).

---

## Scenario 1 — Worked Example

### Structure

- 8 players, 2 teams of 4, 3 rounds, 2 groups per round

### Team Competition (Matches)

| Round     | Format    | Competition  | Points/Win | Total Available |
| --------- | --------- | ------------ | ---------- | --------------- |
| 1         | Rumble    | `rumble`     | 2          | 2               |
| 2         | Best Ball | `best_ball`  | 2          | 4               |
| 3         | Singles   | `match_play` | 1          | 8               |
| **Total** |           |              |            | **14**          |

### Individual Competition

- Individual Scoreboard always shown — Gross, Net, Stableford columns
- Bonus competitions (contributor mode): NTP + LD per round → +1 pt each → 6 total bonus points across 3 rounds
- Commissioner marks `total` as `primaryScoringBasis` (stableford + bonuses)

---

## Scenario 2 — Worked Example

### Structure

- 16 players, 2 teams of 8, 3 rounds, 4 groups per round

### Team Competition (Matches)

| Round     | Format    | Competition  | Matches | Points/Win | Total Available |
| --------- | --------- | ------------ | ------- | ---------- | --------------- |
| 1         | Foursomes | —            | —       | —          | — (deferred)    |
| 2         | Best Ball | `best_ball`  | 4       | 1          | 4               |
| 3         | Singles   | `match_play` | 8       | 1          | 8               |
| **Total** |           |              |         |            | **12** (est.)   |

> Note: Foursomes (alternate shot) is deferred — see `future-additions.md`.

### Individual Competition

- Individual Scoreboard always shown — commissioner marks `stableford` as `primaryScoringBasis`
- No bonus scoring

---

## Mapping to Current System

### What aligns well

| Their concept                                 | Our model                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Tournament, Players, Teams                    | `tournaments`, `tournamentParticipants`, `tournamentTeams`              |
| Rounds, Groups                                | `rounds`, `roundGroups`, `roundParticipants` (with `roundGroupId`)      |
| Individual hole scores                        | `scoreEvents` (append-only)                                             |
| Individual competition (aggregate stableford) | Auto-computed Individual Scoreboard (not a `competitions` row)          |
| Team competition (match wins)                 | `competitions` with `competitionCategory: 'match'`                      |
| Points per win / per half                     | `pointsPerWin` / `pointsPerHalf` on match configs                       |
| Multiple competitions simultaneously          | Multiple `competitions` per round (1 match + 1 game + N bonuses)        |
| Per-hole game decisions (Wolf)                | `gameDecisions` table (append-only; latest per competitionId+hole wins) |

### Resolved gaps

1. ~~**Round-level format label**~~ ✅ Done — Optional `format` text field on `rounds` for display only (e.g. "Round 1: Irish Rumble"). Scoring logic stays on competitions.

2. ~~**Per-round competition constraints**~~ ✅ Done — At most 1 match + 1 game + unlimited bonuses per round. Validated at creation time.

3. ~~**Irish Rumble**~~ ✅ Implemented — `rumble` format engine with escalating per-hole scoring (holes 1–6: best 1, 7–12: best 2, 13–17: best 3, 18: all 4 stableford scores). `all` scope. Groups must be 4-player, all same team.

4. ~~**Group vs group scope**~~ ✅ Resolved — Rumble uses `all` scope (no new `between_groups` scope needed). Team pairings auto-derived from group + team membership, not explicit config.

5. ~~**Bonus dual-mode (standalone vs contributor)**~~ ✅ Done — `bonusMode` (`standalone` | `contributor`) and `bonusPoints` on NTP/LD configs.

6. ~~**Variable points per round**~~ ✅ Done — `pointsPerWin` is per competition, each round has its own competitions.

7. ~~**Individual scoreboard as a competition**~~ ✅ Resolved — Individual Scoreboard is auto-computed; `stableford` and `stroke_play` competition types are retired from the UI.

8. ~~**`participantType` field**~~ ✅ Renamed — `participantType` → `competitionCategory` (`'match' | 'game' | 'bonus'`).

9. ~~**`roundTeams` / `roundTeamMembers`**~~ ✅ Dropped — These tables were never written to in practice. Teams are tournament-level only.

### Remaining gaps / new work

1. **`gameDecisions` table** — new, append-only, required for Wolf declarations. Schema migration needed.

2. **`primaryScoringBasis` field** — new column on `rounds` and `tournaments`. Schema migration needed.

3. **`competitionCategory` enum** — `competitions` table needs the `match | game | bonus` discriminant (replacing `participantType`).

4. **Wolf declaration UI** — the live scoring view needs a per-hole Wolf partner selection panel. Appears only on the wolf's hole during the round.

5. **Hi-Lo engine** — new `hi-lo.ts` implementing the dual high-ball + low-ball match per hole.

6. **Wolf engine** — new `wolf.ts` consuming `gameDecisions` for partner declarations.

7. **Six Point engine** — new `six-point.ts` with configurable 4-value distribution and tie-splitting.

8. **Chair engine** — new `chair.ts` with state-machine hole-by-hole chair tracking.

9. **Auto-computed leaderboards** — `tournamentStandings` table deprecated. New auto-computed Individual Leaderboard and Team Leaderboard replace it.

10. **Foursomes** — still deferred. See `future-additions.md`.
