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
- Competitions (1+)

A tournament can run:

- Team competitions
- Individual competitions
- Both simultaneously

### 2. Players & Teams

- A Player belongs to exactly one Team (if teams are used) and multiple Rounds
- A Team contains 1+ Players

Teams are just groupings. They don't define scoring — Competitions do.

### 3. Rounds

A Round represents one day/session of golf.

Each round contains:

- Groups (max 4 players per group)
- Matches (optional, derived from format)
- Individual hole scores
- Round format (e.g. singles, fourball, rumble, etc.)

**Important distinction:**

> A Round defines **how golf is played**.
> A Competition defines **how points are awarded**.

### 4. Groups

A Group:

- Max 4 players
- Purely logistical (who plays together)
- Does NOT determine scoring rules

### 5. Match Formats (Round-Level Concept)

Each round has a Format, e.g.:

- Irish Rumble
- Foursomes
- Fourball
- Singles
- Strokeplay
- Stableford

The format determines:

- Whether matches exist
- Whether play is team vs team
- Whether scoring is matchplay, aggregate score, stableford, best-ball, or alternate shot

**But format does not determine how many tournament points are awarded.** That is competition-level logic.

### 6. Competitions (The Key Abstraction)

A Competition decides how winners are calculated from round data.

**Each round has up to:**

- **1 Team competition** — applies to all groups in the round (e.g. match play, best ball)
- **1 Individual scoring method** — stableford, stroke play, etc.
- **Bonus competitions** — NTP, LD (0 or more)

This is the natural unit: one day of golf has one team format, one individual format, and optional bonuses.

#### Team Competition

Properties:

- Scope: Team
- Scoring source: per match, per round result, or per player result
- Points per win
- Draw handling (½ point? none?)
- Total points available (derived)

#### Individual Competition

Properties:

- Scope: Player
- Scoring source: aggregated stableford, strokeplay total, best N rounds

#### Bonus Competitions (NTP / LD)

Bonus competitions are award-based (commissioner picks the winner). They can operate in two modes:

1. **Standalone** — a separate competition with a single winner per round (current behaviour)
2. **Contributor to individual standings** — the bonus award adds points (e.g. +1 stableford) to the winner's individual aggregate across the tournament

The commissioner chooses the mode when setting up the bonus. Both modes can coexist — e.g. NTP as standalone, LD as contributor.

---

## Scenario 1 — Worked Example

### Structure

- 8 players, 2 teams of 4, 3 rounds, 2 groups per round

### Team Competition

| Round     | Format             | Matches            | Points/Win | Total Available |
| --------- | ------------------ | ------------------ | ---------- | --------------- |
| 1         | Irish Rumble       | 1 (group vs group) | 2          | 2               |
| 2         | Fourball Matchplay | 2 (pair vs pair)   | 2          | 4               |
| 3         | Singles            | 4                  | 1          | 8               |
| **Total** |                    |                    |            | **14**          |

### Individual Competition

- Scoring basis: Total Stableford across all 3 rounds
- No relation to team results
- Bonus rules: per round, 1 × NTP → +1 stableford point, 1 × LD → +1 stableford point (configured as **contributor** mode)
- Across 3 rounds: 6 total bonus points available
- Bonuses are added to the player's aggregate stableford in the individual tournament standings, independent of team scoring

---

## Scenario 2 — Worked Example

### Structure

- 16 players, 2 teams of 8, 3 rounds, 4 groups per round

### Team Competition

| Round     | Format    | Matches | Points/Win | Total Available |
| --------- | --------- | ------- | ---------- | --------------- |
| 1         | Foursomes | 4       | 1          | 4               |
| 2         | Fourball  | 4       | 1          | 4               |
| 3         | Singles   | 8       | 1          | 8               |
| **Total** |           |         |            | **16**          |

### Individual Competition

- Total Stableford across 3 rounds
- No bonus scoring

---

## Mapping to Current System

### What aligns well

| Their concept                                 | Our model                                                          |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Tournament, Players, Teams                    | `tournaments`, `tournamentParticipants`, `tournamentTeams`         |
| Rounds, Groups                                | `rounds`, `roundGroups`, `roundParticipants` (with `roundGroupId`) |
| Individual hole scores                        | `scoreEvents` (append-only)                                        |
| Individual competition (aggregate stableford) | `tournamentStandings` with `sum_stableford` aggregation            |
| Team competition (match wins)                 | `tournamentStandings` with `match_wins` aggregation                |
| Points per win / per half                     | `pointsPerWin` / `pointsPerHalf` on match configs                  |
| Multiple competitions simultaneously          | Multiple `competitions` per round + multiple `tournamentStandings` |

### Conceptual gaps / new work needed

1. ~~**Round-level format label**~~ ✅ Done — Added optional `format` text field to `rounds` table for display/organisation (e.g. "Round 1: Irish Rumble"). Scoring logic stays on competitions.

2. ~~**Per-round competition constraints**~~ ✅ Done — `createCompetitionFn` enforces max 1 team + max 1 individual competition per round. Bonuses unlimited.

3. **New match formats** — Irish Rumble (group vs group aggregate) is not yet implemented as a competition format type. (Foursomes is deferred — see `future-additions.md`.)

4. **Group vs group scope** — Irish Rumble is "group 1 vs group 2" — an inter-group competition. We currently have `all` and `within_group` scopes. See `future-additions.md` for options.

5. ~~**Bonus dual-mode (standalone vs contributor)**~~ ✅ Done — NTP/LD configs now have `bonusMode` (`standalone` | `contributor`) and `bonusPoints`. The `sum_stableford` aggregation engine incorporates contributor-mode bonus awards into individual standing totals.

6. **Variable points per round** — Already works ✅ — `pointsPerWin` is per competition, and each round has its own competitions.
