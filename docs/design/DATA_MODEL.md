# Data Model & Terminology

Definitive reference for the tournament data model, entity names, and vocabulary.

All code, UI, and documentation should use the terms defined here consistently.

---

## Glossary

| Term           | Definition                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Person**     | A user account / identity. Exists independently of any tournament.                        |
| **Tournament** | A series of rounds with a roster of players and optional teams.                           |
| **Player**     | A person's membership in a specific tournament (role: commissioner or player).            |
| **Team**       | A named persistent group of players within a tournament.                                  |
| **Round**      | A single outing on one course within a tournament.                                        |
| **Group**      | A playing group (fourball/threeball) within a round.                                      |
| **Score**      | Per-hole stroke data for a player in a round. Append-only (latest wins).                  |
| **Scoreboard** | Individual rankings (gross/net/stableford) — always derived from scores, never stored.    |
| **Game**       | A competitive format played within a group (wolf, match play, best ball, etc.).           |
| **Format**     | The type/rules of a game (match_play, wolf, six_point, chair, best_ball, hi_lo, rumble).  |
| **Decision**   | A per-hole in-game choice (e.g., Wolf picks a partner). Append-only.                      |
| **Side Game**  | A bonus award: Nearest the Pin or Longest Drive. Per-round, one winner across all groups. |

---

## Hierarchy

```
Person (account / identity)
  └── can be a Player in many Tournaments

Tournament (mode: individual | team)
  ├── Players (roster, role: commissioner | player)
  ├── Teams (mandatory if team mode, N/A if individual mode)
  │     └── Team Members → Players
  ├── scoringBasis (gross_strokes | net_strokes | stableford)
  ├── trackIndividualScoreboard (boolean; hardcoded true in individual mode, toggle in team mode)
  └── Rounds (1+)
        ├── label (optional display name, e.g. "Day 1 - Irish Rumble")
        ├── Groups
        │     ├── Round Players (with handicap snapshot)
        │     ├── Scores (per-hole strokes, always recorded)
        │     └── Game (0 or 1 per group)
        │           ├── format (wolf, match_play, best_ball, etc.)
        │           ├── config (format-specific JSON)
        │           └── Decisions (per-hole game choices)
        └── Side Games (0+ per round; NTP/LD, one winner across all groups)
```

---

## Tournament Mode

A tournament declares its mode upfront. This constrains available formats and determines the primary leaderboard.

| Mode           | Teams          | Available Formats                                 | Primary Leaderboard | Individual Scoreboard |
| -------------- | -------------- | ------------------------------------------------- | ------------------- | --------------------- |
| **individual** | Not applicable | match_play, wolf, six_point, chair                | Game results        | Always shown          |
| **team**       | Mandatory      | best_ball, hi_lo, rumble, match_play (cross-team) | Team standings      | Optional (toggle)     |

---

## Format Classification

The format inherently determines whether a game is individual or team-based.

### Individual Formats (individual mode only)

| Format     | Required Group Size | Description                                       |
| ---------- | ------------------- | ------------------------------------------------- |
| match_play | 2 per pairing       | Head-to-head match play within a group            |
| wolf       | Exactly 4           | Rotating wolf picks partner or goes lone per hole |
| six_point  | Exactly 3           | 6 points distributed per hole (4/2/0)             |
| chair      | 2+                  | Musical chairs — hold chair, earn points          |

### Team Formats (team mode only)

| Format     | Group Composition   | Description                                        |
| ---------- | ------------------- | -------------------------------------------------- |
| best_ball  | 2 teams × 2 players | Best stableford from each pair, match play scoring |
| hi_lo      | 2 teams × 2 players | High ball + low ball parallel matches              |
| rumble     | 4 same-team players | Escalating stableford contribution per hole range  |
| match_play | Cross-team pairings | 1v1 matches contributing team points               |

---

## Constraints

### Per-Group

- At most **one game per group**

### Per-Round (team mode)

- **All groups must play the same format** — enables a single team leaderboard
- Each group's game produces team points (configurable `pointsPerWin`, `pointsPerHalf`)

### Per-Round (individual mode)

- Groups **may play different formats** — creates per-format rankings if they differ
- If all groups play the same format → combined ranking across all players

### Side Games

- Available in any mode, any round
- One NTP and/or one LD per round, on one specific hole each
- One winner across all groups
- Two modes: **standalone** (badge only) or **contributor** (adds bonus points to scoreboard)

---

## Scoreboard (Always Computed)

The Individual Scoreboard is derived from raw scores — it is not a game and requires no configuration.

| Column        | Derivation                                                   |
| ------------- | ------------------------------------------------------------ |
| Gross strokes | Sum of raw strokes                                           |
| Net strokes   | Gross minus handicap strokes received per hole               |
| Stableford    | Standard 2-diff per hole, min 0, summed                      |
| Bonus         | Points from contributor-mode side games                      |
| Total         | Stableford + bonus (shown only if contributor bonuses exist) |

The tournament's `scoringBasis` determines which column ranks players on the leaderboard.

---

## Leaderboard Aggregation

### Individual Mode — Game Leaderboard

| Format          | Per-group output     | Tournament aggregation                    |
| --------------- | -------------------- | ----------------------------------------- |
| wolf, six_point | Per-player points    | Sum across rounds → rank                  |
| match_play      | Winner per pairing   | Points per win → sum across rounds → rank |
| chair           | Points per hole held | Sum across rounds → rank                  |

If different groups play different formats: results shown separately, no cross-format aggregation.

### Team Mode — Team Leaderboard

Each game instance produces team points:

- `pointsPerWin` (configurable per game, e.g., Ryder Cup = 1)
- `pointsPerHalf` (configurable)
- Sum across all groups in a round → round team score
- Sum across all rounds → tournament team standings

### Individual Scoreboard (Tournament Level)

- Aggregated across all finalised rounds
- Player included only if all holes completed in that round
- Ranked by tournament `scoringBasis`

---

## DB Table Mapping

| Entity       | Table Name      | Primary Key | Key Foreign Keys                             |
| ------------ | --------------- | ----------- | -------------------------------------------- |
| Person       | `persons`       | `id`        | `userId` → profiles (nullable)               |
| Tournament   | `tournaments`   | `id`        | `createdByUserId` → profiles                 |
| Player       | `players`       | `id`        | `tournamentId`, `personId`                   |
| Team         | `teams`         | `id`        | `tournamentId`                               |
| Team Member  | `team_members`  | `id`        | `teamId`, `playerId`                         |
| Round        | `rounds`        | `id`        | `tournamentId`, `courseId`                   |
| Group        | `groups`        | `id`        | `roundId`                                    |
| Round Player | `round_players` | `id`        | `roundId`, `groupId`, `personId`, `playerId` |
| Score        | `scores`        | `id`        | `roundId`, `roundPlayerId`                   |
| Game         | `games`         | `id`        | `tournamentId`, `roundId`, `groupId`         |
| Decision     | `decisions`     | `id`        | `gameId`, `roundId`, `groupId`               |
| Side Game    | `side_games`    | `id`        | `roundId`, `winnerId` → round_players        |
| Course       | `courses`       | `id`        | —                                            |
| Course Hole  | `course_holes`  | `id`        | `courseId`                                   |

---

## Vocabulary Rules

| When you mean...            | Say...         | NOT...                             |
| --------------------------- | -------------- | ---------------------------------- |
| The overall series          | Tournament     | Event, Competition, Season         |
| A day of golf               | Round          | Event, Outing, Day                 |
| A fourball on course        | Group          | Round Group, Team, Fourball        |
| Someone in the tournament   | Player         | Participant, Member                |
| Per-hole strokes            | Score          | Score Event, Entry                 |
| Individual rankings         | Scoreboard     | Competition, Leaderboard           |
| What format they're playing | Game           | Competition, Match, Contest        |
| The type/rules of a game    | Format         | Format Type, Category              |
| NTP / Longest Drive         | Side Game      | Bonus, Bonus Award, Competition    |
| Wolf partner picks          | Decision       | Game Decision, Declaration         |
| Tournament type setting     | Mode           | Category, Type                     |
| Overall team ranking        | Team Standings | Team Leaderboard, Team Competition |

---

## Migration from Previous Model

### Table Renames

| Old Table                 | New Table                |
| ------------------------- | ------------------------ |
| `tournament_participants` | `players`                |
| `round_participants`      | `round_players`          |
| `tournament_teams`        | `teams`                  |
| `tournament_team_members` | `team_members`           |
| `round_groups`            | `groups`                 |
| `score_events`            | `scores`                 |
| `competitions`            | `games`                  |
| `bonus_awards`            | `side_games`             |
| `game_decisions`          | `decisions`              |
| `tournament_standings`    | _(deleted — deprecated)_ |

### Column Changes

| Table         | Old Column                | New Column                         | Notes                                          |
| ------------- | ------------------------- | ---------------------------------- | ---------------------------------------------- |
| `tournaments` | `primaryScoringBasis`     | `scoringBasis`                     | Rename                                         |
| `tournaments` | —                         | `mode`                             | New: `individual \| team`                      |
| `tournaments` | —                         | `trackIndividualScoreboard`        | New: boolean, default true                     |
| `rounds`      | `format`                  | `label`                            | Rename (free-text display name only)           |
| `rounds`      | `primaryScoringBasis`     | —                                  | Remove (use tournament-level `scoringBasis`)   |
| `games`       | `competitionCategory`     | —                                  | Remove (implied by format)                     |
| `games`       | `formatType`              | `format`                           | Rename                                         |
| `games`       | `groupScope`              | —                                  | Remove (all games are per-group by definition) |
| `games`       | `configJson`              | `config`                           | Rename                                         |
| `games`       | `roundGroupId` (nullable) | `groupId` (required)               | Make non-nullable                              |
| `side_games`  | _(was bonus_awards)_      | `format`, `holeNumber`, `winnerId` | Restructure — one row per round per type       |
