# Competition System Specification

> This document defines the intended behaviour of the competition system across all combinations of player counts, groups, teams, and single vs multi-round tournaments.

---

## 1. Core Concepts

### 1.1 Base Scoring

Every round tracks **strokes** for all players, for every hole. From strokes, two metrics are always derived:

- **Gross strokes** — raw total strokes
- **Stableford points** — net-adjusted points per hole using the standard scale (0–5)

These are calculated automatically for every player. An **Individual Scoreboard** is always available, showing every player ranked by the tournament's primary scoring basis (typically stableford).

Base scoring is **not** a selectable competition — it is implicit and always present.

### 1.2 Competition Categories

There are exactly three competition categories:

| Category       | Purpose                                                                 | When Available              | Scope                                      |
| -------------- | ----------------------------------------------------------------------- | --------------------------- | ------------------------------------------ |
| **Game**       | Individual player-vs-player format played within a group                | When teams are **disabled** | Per-group                                  |
| **Team Match** | Team-vs-team format where each match earns points toward the team event | When teams are **enabled**  | Per-group (uniform type across all groups) |
| **Bonus**      | Side prize awarded to a single player (e.g., nearest the pin)           | Always                      | Across all players                         |

### 1.3 Available Formats

#### Games (individual, no teams)

| Format             | Required Group Size   | Description                                                              |
| ------------------ | --------------------- | ------------------------------------------------------------------------ |
| Wolf               | Exactly 4             | Rotating wolf picks a partner or goes lone/blind-lone. Points per hole.  |
| Six Point          | Exactly 3             | Fixed 6-point distribution (4/2/0) per hole with tie-splitting.          |
| Chair              | 2+ (any)              | Musical chairs — best score takes/keeps the chair, holder earns points.  |
| Singles Match Play | Exactly 2 per pairing | Head-to-head match play. Commissioner creates pairings within the group. |

All games run **within each group** independently. When groups exist, each group can play a **different** game format (at most one game per group).

#### Team Matches (teams enabled)

| Format               | Group Composition                  | Description                                                                                                             |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Best Ball (Fourball) | 2 teams × 2 players per group      | Each pair's best stableford per hole. Match play scoring between pairs. Each match = 1 win/half/loss toward team total. |
| Hi-Lo                | 2 teams × 2 players per group      | Two sub-matches per hole (high ball + low ball). 2 points available per hole.                                           |
| Rumble               | 4 players from same team per group | Escalating contribution: best 1 (H1–6), best 2 (H7–12), best 3 (H13–17), all 4 (H18).                                   |
| Singles Match Play   | 2+ players, cross-team pairings    | 1v1 matches. Commissioner manually creates cross-team pairings. Each match = 1 win/half/loss toward team total.         |

When teams are enabled, **exactly one team match type** must be selected, and it applies uniformly across all groups in the round. Each group's match produces team points (configurable `pointsPerWin`, `pointsPerHalf`). These aggregate to a round-level team score and ultimately to a tournament-level team score.

#### Bonus Games

| Format          | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| Nearest the Pin | Awarded on a specific hole. Commissioner designates the winner. |
| Longest Drive   | Awarded on a specific hole. Commissioner designates the winner. |

Bonus games span **all players** across all groups. Each bonus can optionally award stableford points to the winner:

- **Standalone mode** — the winner gets a display badge only (no score impact)
- **Contributor mode** — the winner receives bonus stableford points added to their total

There is no limit on the number of bonus games per round.

### 1.4 Group Scope (Simplified)

The current `groupScope` field (`'all'` | `'within_group'`) on the `competitions` table is unnecessary for user configuration. The scope is **always derivable**:

| Category   | Effective Scope                      |
| ---------- | ------------------------------------ |
| Game       | Always per-group (within each group) |
| Team Match | Always per-group (within each group) |
| Bonus      | Always across all players            |

The `groupScope` field should be removed from the competition creation UI and derived automatically on the server side. The DB column can be retained for backward compatibility but should be auto-set, never user-selectable.

---

## 2. Scenario Matrix

There are four configuration combinations, each of which can be a single round or part of a multi-round tournament:

| #     | Players | Groups                | Teams | Games Available       | Team Matches Available   |
| ----- | ------- | --------------------- | ----- | --------------------- | ------------------------ |
| **A** | ≤ 4     | No (1 implicit group) | No    | Yes (max 1)           | No                       |
| **B** | ≥ 5     | Yes (max 4 per group) | No    | Yes (max 1 per group) | No                       |
| **C** | ≤ 4     | No (1 implicit group) | Yes   | No                    | Yes (exactly 1)          |
| **D** | ≥ 5     | Yes (max 4 per group) | Yes   | No                    | Yes (exactly 1, uniform) |

---

## 3. Detailed Scenario Specifications

### Scenario A: ≤ 4 Players, No Groups, No Teams

**Setup:**

- All players are in a single implicit group.
- No team assignment is possible.

**Competition selection:**

- User may select **at most one Game** from the available formats (constrained by player count in the group: Wolf requires 4, Six Point requires 3, Chair requires 2+, Singles Match Play requires manual pairings of 2).
- User may add **any number of Bonus games**.
- **Team Match** options are hidden/disabled.

**Leaderboard display:**

- **Individual Scoreboard**: All players ranked by primary scoring basis. Always visible.
- **Competitions section**: Shows the game result (if any) as a single leaderboard/result view.
- **Bonus section**: Shows bonus prize outcomes below the competitions.

**No aggregation needed** — there is only one group and one round (in single-round context).

---

### Scenario B: ≥ 5 Players, Groups, No Teams

**Setup:**

- Players are distributed into groups of up to 4 players each.
- No team assignment is possible.

**Competition selection:**

- Each group may independently select **at most one Game** from the available formats (constrained by that group's player count).
- User may add **any number of Bonus games** (these span all groups).
- **Team Match** options are hidden/disabled.

**Leaderboard display:**

- **Individual Scoreboard**: All players **across all groups** ranked together in a single leaderboard by primary scoring basis. Always visible.
- **Competitions section**: For each game format played:
  - If only one group plays that format: show that group's result.
  - If multiple groups play the **same** format: show each group's result separately (labelled by group name), **plus** a combined leaderboard that merges all individual player scores from those groups into one ranking.
  - If groups play **different** formats: show each group's result under its own heading.
- **Bonus section**: Shows bonus prize outcomes. These span all players across all groups.

---

### Scenario C: ≤ 4 Players, No Groups, Teams Enabled

**Setup:**

- All players are in a single implicit group.
- Players are assigned to teams (tournament-level property).

**Competition selection:**

- **Exactly one Team Match** must be selected. This is mandatory when teams are enabled.
- Individual **Games are disabled** (hidden/not selectable).
- User may add **any number of Bonus games**.

**Leaderboard display:**

- **Individual Scoreboard**: All players ranked by primary scoring basis. Always visible.
- **Competitions section**: Shows the team match result.
- **Team standings**: Shows the winning team based on team match points.
- **Bonus section**: Shows bonus prize outcomes.

---

### Scenario D: ≥ 5 Players, Groups, Teams Enabled

**Setup:**

- Players are distributed into groups of up to 4 players each.
- Players are assigned to teams (tournament-level property).

**Competition selection:**

- **Exactly one Team Match** must be selected. The **same match type** applies uniformly to all groups.
- Individual **Games are disabled** (hidden/not selectable).
- User may add **any number of Bonus games** (these span all groups).

**Team match point system:**

- Each group's match produces one outcome (win/half/loss for each team involved).
- Each win earns `pointsPerWin` (configurable, default 1). Each half earns `pointsPerHalf` (configurable, default 0.5).
- For formats with multiple sub-matches per group (e.g., Singles Match Play with 2 pairings in a group of 4), each sub-match independently contributes points.
- Team points aggregate across all groups within the round to produce a **round-level team score**.

**Leaderboard display:**

- **Individual Scoreboard**: All players **across all groups** ranked together in a single leaderboard by primary scoring basis.
- **Competitions section**:
  - Each group's team match result shown separately (labelled by group name).
  - A **combined** team standings view showing the sum of team points across all groups.
- **Team standings**: Shows the team score for the round (sum of match points across groups).
- **Bonus section**: Shows bonus prize outcomes spanning all players.

---

## 4. Tournament (Multi-Round) Behaviour

A tournament contains one or more rounds. Each round operates per the scenarios above. The following properties are fixed at tournament level and apply to all rounds:

- **Teams** — team composition is a tournament-level property, consistent across all rounds.
- **Primary scoring basis** — configured at tournament level.

### 4.1 Individual Leaderboard (Tournament Level)

- Aggregates base scoring (gross, net, stableford) across all **finalised** rounds.
- A player's round is included only if all holes are completed.
- Contributor bonus points are included in the stableford total.
- Ranking: sorted by stableford descending, then gross strokes ascending (tiebreaker).
- Non-finalised rounds are shown as "Pending" in per-round cells.
- Players absent from a finalised round show "Absent".

### 4.2 Competition Results (Tournament Level)

#### Without teams:

- Game results **are not aggregated** across rounds (no meaningful way to combine Wolf points from Round 1 with Six Point points from Round 2).
- Instead, show each round's game results as standalone, with per-group and combined results following the same display rules as the single-round view.
- Presented as a list of rounds, each showing its competition outcomes.

#### With teams:

- Team match points from each round are **aggregated** into an overall tournament team score.
- Each finalised round contributes its round-level team points to the tournament total.
- The tournament team leaderboard shows:
  - Total team points across all rounds.
  - Per-round breakdown of team points.
  - Rank by total team points.
- This determines the **overall winning team** of the tournament.

### 4.3 Bonus Games (Tournament Level)

- Bonus games remain per-round — there is no cross-round aggregation of bonus awards.
- However, contributor bonus points **do** feed into the tournament individual leaderboard totals.
- Standalone bonus awards are shown as badges on the per-round breakdown.

---

## 5. UI Changes Required

### 5.1 Competition Buttons

**Current state:** Four buttons — `+ Game`, `+ Match`, `+ Team Match`, `+ Bonus`

**Desired state:** Three buttons — `+ Game`, `+ Team Match`, `+ Bonus`

| Button         | Visible When                       | Contains                                     |
| -------------- | ---------------------------------- | -------------------------------------------- |
| `+ Game`       | Teams disabled, ≥ 2 players        | Wolf, Six Point, Chair, Singles Match Play   |
| `+ Team Match` | Teams enabled, ≥ 2 players         | Best Ball, Hi-Lo, Rumble, Singles Match Play |
| `+ Bonus`      | Always (when commissioner + draft) | Nearest the Pin, Longest Drive               |

### 5.2 Singles Match Play in the Game Flow

- Move Singles Match Play from the separate `+ Match` dialog into the `+ Game` dialog.
- When selected, show the pairings UI (as today's match dialog) within the game creation flow.
- Category in DB: `'game'` (not `'match'`).

### 5.3 Remove Group Scope Selector

- Remove the `groupScope` dropdown from all competition creation/edit dialogs.
- Auto-derive scope on the server: games and team matches → `'within_group'`; bonus → `'all'`.

### 5.4 Per-Group Game Selection

- When groups exist and no teams, each group should be able to independently have a game configured.
- The `+ Game` dialog should either:
  - Allow selecting which group the game is for (dropdown), or
  - Show a per-group game setup section.
- Enforce: at most 1 game per group.

### 5.5 Combined Leaderboard for Same-Format Games

- When multiple groups play the same game format, show:
  1. Each group's result (labelled)
  2. A "Combined" leaderboard merging all player scores
- This applies to both individual games (Scenario B) and team matches (Scenario D, for the team point aggregation).

### 5.6 Competition Section Layout

```
Competitions
├── Team Standings Banner (if teams, showing round team score)
├── [Game/Match Name] — [Format Badge]
│   ├── Group 1 result
│   ├── Group 2 result
│   └── Combined result (if multiple groups play same format)
├── Bonus Prizes
│   ├── Nearest the Pin — Hole 7 — Winner: [Name]
│   └── Longest Drive — Hole 12 — Winner: [Name]
```

---

## 6. Validation Rules

### 6.1 Competition Creation Constraints

| Rule                                             | Enforcement                      |
| ------------------------------------------------ | -------------------------------- |
| At most 1 game per group (no teams)              | Server-side + UI validation      |
| Exactly 1 team match when teams enabled          | Server-side + UI validation      |
| Team match type uniform across all groups        | Server-side + UI validation      |
| Games disabled when teams enabled                | UI hides button + server rejects |
| Team matches disabled when teams not enabled     | UI hides button + server rejects |
| No limit on bonus games                          | —                                |
| Wolf requires exactly 4 players in group         | UI disables + server validates   |
| Six Point requires exactly 3 players in group    | UI disables + server validates   |
| Chair requires 2+ players in group               | UI disables + server validates   |
| Singles Match Play requires valid pairings       | Server validates pairings        |
| Best Ball requires 2 teams × 2 players per group | Server validates composition     |
| Hi-Lo requires 2 teams × 2 players per group     | Server validates composition     |
| Rumble requires 4 same-team players per group    | Server validates composition     |

### 6.2 Server-Side Validation (Currently Missing)

The server currently does **not** validate most competition constraints — only the config schema is checked. The following server-side validations must be added:

- Validate player count requirements for the selected format against the target group.
- Validate that teams exist when creating a team match.
- Validate that no other game exists for the target group.
- Validate that no other team match exists for the round (since team matches are uniform).
- Validate team composition for team formats (2v2 for best_ball/hi_lo, 4 same-team for rumble).
- Reject games when teams are enabled.
- Reject team matches when teams are not enabled.

---

## 7. Data Model Changes

### 7.1 `groupScope` Deprecation

- Stop exposing `groupScope` in the competition creation/edit UI.
- Auto-set on the server:
  - `'within_group'` for games and team matches.
  - `'all'` for bonus competitions.
- Retain the DB column for backward compatibility.
- Consider a migration to set existing values correctly.

### 7.2 `competitionCategory` Enum Update

**Current values:** `'match'` | `'game'` | `'bonus'`

**Proposed change:** The `'match'` category should be repurposed to mean "team match" exclusively. Individual singles match play should use category `'game'`.

- Existing `match_play` competitions with `competitionCategory = 'match'` that are individual (no teams) should be migrated to `'game'`.
- New singles match play created without teams → `'game'`.
- New singles match play created with teams → `'match'` (team match).
- The `'match'` category label in the UI should display as "Team Match".

### 7.3 Per-Group Competition Link

The `roundGroupId` column on `competitions` already exists and links a competition to a specific group. This needs to be:

- **Required** for games (links the game to its target group).
- **NULL** for team matches (since the same match type spans all groups, the engine runs per-group automatically).
- **NULL** for bonus (spans all players).

---

## 8. Domain Engine Changes

### 8.1 Combined Results

Add a new function or extend `calculateGroupedResults` to produce a **combined** result alongside per-group results:

```typescript
{
  scope: 'within_group';
  results: GroupCompetitionResult[];  // per-group results
  combined?: CompetitionResult;        // merged result across all groups
}
```

The combined result merges all participants and scores from all groups and runs the engine once over the full dataset. This is only meaningful for point-based games (wolf, six_point, chair) where individual scores can be compared across groups. For team matches, the "combined" view is the team point aggregation (handled separately).

### 8.2 Team Point Aggregation

Clarify and enforce the team point model:

- Each group match → win/loss/half for the teams involved.
- `pointsPerWin` and `pointsPerHalf` are configurable per competition.
- Round team total = sum of team points across all groups.
- Tournament team total = sum of round team totals across finalised rounds.

### 8.3 isGameFormat / isMatchFormat / isTeamFormat Cleanup

These helper functions need updating:

| Function          | Current Includes                     | Should Include                                       |
| ----------------- | ------------------------------------ | ---------------------------------------------------- |
| `isGameFormat()`  | All non-bonus formats                | wolf, six_point, chair, match_play (when individual) |
| `isTeamFormat()`  | best_ball, hi_lo, rumble             | best_ball, hi_lo, rumble, match_play (when team)     |
| `isMatchFormat()` | match_play, best_ball, hi_lo, rumble | Consider removing — overlaps with team format        |
| `isBonusFormat()` | nearest_pin, longest_drive           | No change                                            |

Note: Since `match_play` can be either a game or a team match depending on context, the classification functions may need to accept the competition category as a parameter, or the distinction should be handled at the category level rather than the format level.

---

## 9. Current Code vs Desired State — Gap Analysis

| Area                              | Current State                                       | Desired State                                                      | Gap                                                   |
| --------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Competition buttons               | 4 buttons (Game, Match, Team Match, Bonus)          | 3 buttons (Game, Team Match, Bonus)                                | Remove Match button, fold singles into Game           |
| Group scope                       | User-selectable toggle                              | Auto-derived from category                                         | Remove UI, auto-set server-side                       |
| Per-group game selection          | Games are per-competition, loosely linked to groups | Each group has at most 1 game, explicitly linked                   | Add group selector to game dialog, enforce constraint |
| Team match uniformity             | No constraint that all groups play same type        | Enforced: exactly 1 team match type for the round                  | Add server-side validation                            |
| Combined leaderboard              | Not implemented                                     | Merge results across groups when same format                       | New domain logic + display component                  |
| Server-side validation            | Minimal (only schema check)                         | Full constraint validation                                         | Significant new validation code                       |
| `competitionCategory`             | `match` covers both individual and team match play  | `match` = team match only; individual match play = `game`          | DB migration + code updates                           |
| Game disabled with teams          | UI disables button                                  | UI hides + server rejects                                          | Add server-side guard                                 |
| Team match disabled without teams | UI disables button                                  | UI hides + server rejects                                          | Add server-side guard                                 |
| Exactly 1 team match              | Not enforced                                        | Enforced server-side + UI                                          | New validation                                        |
| Tournament game display           | Aggregated competition summaries                    | Per-round standalone results, no cross-round aggregation for games | Change tournament leaderboard display                 |
| Tournament team aggregation       | Exists but may need alignment                       | Sum of per-round team points → tournament team winner              | Verify and align                                      |

---

## 10. Glossary

| Term                     | Definition                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base scoring**         | Strokes, gross, stableford — always calculated, not a selectable competition.                                                                         |
| **Game**                 | An individual competition played within a group (wolf, six-point, chair, singles match play without teams).                                           |
| **Team Match**           | A team-vs-team competition played within each group, with results contributing team points (best ball, hi-lo, rumble, singles match play with teams). |
| **Bonus**                | A side prize (nearest pin, longest drive) awarded to one player across all groups.                                                                    |
| **Group**                | A playing group of up to 4 players within a round. Implicit single group when ≤ 4 players.                                                            |
| **Team**                 | A tournament-level team assignment. Fixed across all rounds.                                                                                          |
| **Round**                | A single round of golf on a course, containing groups, competitions, and scores.                                                                      |
| **Tournament**           | A container for one or more rounds, with shared teams and scoring configuration.                                                                      |
| **Combined leaderboard** | A merged view of results from multiple groups playing the same game format.                                                                           |
| **Team standings**       | The running total of team points from team matches within a round or across a tournament.                                                             |
