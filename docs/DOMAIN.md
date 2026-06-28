# Domain

Domain model, scoring engine, and competition design for Aerie — an event-driven golf competition engine.

> This is not a CRUD golf app. This is an **event-driven golf competition engine** with UI on top.

---

## Core Architectural Principles

### 1. Facts Over Calculations

The system stores only raw facts:

- Gross strokes per hole
- Handicap snapshots at round start
- Special prize measurements (e.g., nearest-the-pin distance)
- Per-hole game decisions (e.g., Wolf declarations)
- Structural tournament configuration

Everything else — stableford totals, leaderboard positions, tournament points, match results — is **derived at read time**. These are projections, not truth. They are never persisted.

### 2. Event-Based Scoring

Each hole score is stored as an immutable event:

```
ScoreEvent {
  id
  roundId
  roundParticipantId
  holeNumber
  strokes
  recordedByUserId      // the authenticated user who entered this
  recordedByRole        // "player" | "marker" | "commissioner"
  deviceId
  createdAt
}
```

If a score is corrected, a **new event** is appended. The latest event per `(roundId, roundParticipantId, holeNumber)` wins.

Because events are append-only, the full audit trail is automatic:

- The original entry, who recorded it, and in what role
- Any subsequent corrections (by the same person or a different role)
- Commissioner overrides — just a new event with `recordedByRole: "commissioner"`

No separate "edit" or "override" table is needed. The event history _is_ the audit log.

This gives us:

- **Offline-safe** — events can be created without a connection
- **Sync-safe** — append-only, no destructive merges
- **Auditable** — full history of every change, including who changed what and in what capacity
- **Replayable** — results can be recalculated from events at any time

### 3. Clean Domain Separation

Identity, participation, and authentication are separated.

**User** — an authenticated account:

```
User { id, email, name }
```

**Person** — a human identity (may or may not have an account):

```
Person { id, displayName, userId (nullable), currentHandicap }
```

- `userId` is null → Guest
- `userId` exists → Registered user
- `currentHandicap` — self-managed, manually updated over time as part of the player's profile

> Guests are not a role. They are a `Person` without a `userId`.

**Player** — links a person to a tournament:

```
Player { id, tournamentId, personId, role, handicapOverride (nullable) }
```

- `role` — `'player'` | `'commissioner'`
- `handicapOverride` — a commissioner may set this to override the player's handicap for the entire tournament

**RoundPlayer** — links a tournament player to a specific round:

```
RoundPlayer { id, roundId, playerId, groupId (nullable), handicapSnapshot, handicapOverride (nullable) }
```

- `handicapSnapshot` — captured from `Person.currentHandicap` when the round is created
- `handicapOverride` — a commissioner may override for this specific round
- Not every player plays every round (golf holidays have rest days, late arrivals, etc.)

**Effective handicap** for scoring is resolved as:

```
RoundPlayer.handicapOverride
  ?? Player.handicapOverride
    ?? RoundPlayer.handicapSnapshot
```

This allows:

- Guests to participate and persist across rounds
- Guests to claim an account at any time (link `userId`)
- People to be reused across tournaments
- Players to manage their own handicap over time
- Commissioners to override handicaps at tournament or round level
- Past rounds to be unaffected by future handicap changes
- Lifetime stats to be built later

---

## Terminology

Three distinct concepts are used consistently throughout the app:

| Term        | Definition                                                   |
| ----------- | ------------------------------------------------------------ |
| **Scoring** | Entering strokes on the scorecard whilst playing             |
| **Matches** | Competitive events played between members of opposing teams  |
| **Games**   | Competitive events played between individuals within a group |

Matches and Games are overlaid on the same raw scorecard data. Neither affects score entry.

---

## Domain Model

### Tournament Structure

```
Tournament (mandatory)
  → Players → Person
  → Teams (optional, persistent team identities)
    → TeamMembers → Player
  → Rounds
    → Groups (playing groups / fourballs, 1–4 players each)
    → RoundPlayers (with handicap snapshot, assigned to a group)
      → ScoreEvents
    → Games (optional — matches and individual games; one game per group)
      → Decisions (for Wolf — per-hole declarations; append-only)
    → SideGames (optional — NTP/LD; one winner per side game)
```

Every round belongs to a tournament (`tournament_id` NOT NULL). A casual round is simply a 1-round tournament.

Teams are **tournament-level only** — they are fixed for the duration of the tournament. Playing groups (who physically plays together in a round) may change round to round; team membership does not.

Each round stores:

- Course reference
- Round number / date
- Status: `draft` | `scheduled` | `open` | `finalized`
- `label` — optional display label (e.g. "Round 1: Irish Rumble")

### Course Library

Courses are a **shared, global resource** — not scoped to a tournament.

```
Course { id, name, location, numberOfHoles, createdByUserId }
CourseHole { id, courseId, holeNumber, par, strokeIndex, yardage (optional) }
```

- **Viewable** by all authenticated users
- **Editable** by Admins only (may open up later)
- Referenced by Rounds, never embedded or copied

### Core Entities

| Entity      | Purpose                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| Tournament  | Top-level container (mandatory, even for a single round)                   |
| Round       | A single round of golf within a tournament                                 |
| Group       | A playing group / fourball within a round (1–4 players)                    |
| Course      | A golf course (shared library)                                             |
| CourseHole  | Hole-level data for a course (par, SI, yardage)                            |
| Person      | A human identity (guest or registered) with handicap                       |
| Player      | Links a Person to a Tournament (role + HC override)                        |
| Team        | A persistent team identity for the tournament                              |
| TeamMember  | Links a Player to a Team                                                   |
| RoundPlayer | Links a Player to a Round + Group (+ HC snapshot)                          |
| ScoreEvent  | An immutable record of strokes on a hole                                   |
| Game        | A round+group-scoped scoring format config (match or individual game)      |
| SideGame    | A round-scoped bonus prize (NTP/LD) with optional bonus points             |
| Decision    | An immutable record of a per-hole game decision (e.g. Wolf partner choice) |

### Key Relationships

- Tournament → many Rounds (mandatory, `tournament_id` NOT NULL)
- Tournament → many Players → Person
- Tournament → many Teams → TeamMembers → Players
- Round → one Course
- Round → many Groups (playing fourballs)
- Round → many RoundPlayers → Player
- RoundPlayer → one Group (nullable)
- Group → at most one Game → Decisions
- Round → many SideGames

> **Why RoundPlayer?** Not everyone plays every round. Handicap snapshots are per-round. This is the natural join.

> **Why Group?** Groups are the operational unit on the course — who physically plays together. They are distinct from teams (a group of 4 may contain 2 players from each team).

> **Why tournament-level teams only?** Teams are a persistent identity for the tournament ("Team Europe"). Playing partners change round to round but team membership does not. Having a single source of truth avoids sync and consistency problems.

> **Why one game per group?** Each group plays one format at a time. Having `groupId` required on `games` makes this explicit and eliminates the need for a separate `groupScope` column.

---

## Real-World Scenarios

### Scenario 1: 8-Player Tournament

**Structure:** 8 players, 2 teams of 4, 3 rounds, 2 groups of 4 per round.

**Round 1 — Rumble:** Group 1 (all Team 1) vs Group 2 (all Team 2). Commissioner sets winning team receives 2 points.

**Round 2 — Best Ball:** Both groups playing 2v2 from each team, lowest stableford score across the pair wins the hole, matchplay. Winning pair receives 2 points.

**Round 3 — Singles:** Each group has 2 members from each team, 2 matches per group. Winning player receives 1 point.

Individual tournament running across all 3 rounds (best overall stableford combined). NTP and LD in each round, +1 bonus stableford point each (6 total bonus points available, contributor mode).

#### Team Competition

| Round     | Format    | Competition  | Points/Win | Total Available |
| --------- | --------- | ------------ | ---------- | --------------- |
| 1         | Rumble    | `rumble`     | 2          | 2               |
| 2         | Best Ball | `best_ball`  | 2          | 4               |
| 3         | Singles   | `match_play` | 1          | 8               |
| **Total** |           |              |            | **14**          |

#### Individual Competition

- Individual Scoreboard always shown — Gross, Net, Stableford columns
- Bonus competitions (contributor mode): NTP + LD per round → +1 pt each → 6 total bonus points
- Commissioner marks `total` as `primaryScoringBasis` (stableford + bonuses)

---

### Scenario 2: 16-Player Tournament

**Structure:** 16 players, 2 teams of 8, 3 rounds, 4 groups of 4 per round.

**Round 1 — Foursomes:** Alternate shot, pairs vs pairs within each group, 2 from each team. 1 point per match win. _(Foursomes is deferred — see `TODO.md`.)_

**Round 2 — Best Ball (Fourballs):** Pairs vs pairs within each group, 2 from each team. 1 point per match win.

**Round 3 — Singles:** Each group 2 members per team, 2 matches per group. 1 point per win.

Individual tournament across all 3 rounds, stableford basis, no bonus scoring.

#### Team Competition

| Round     | Format    | Competition  | Matches | Points/Win | Total Available |
| --------- | --------- | ------------ | ------- | ---------- | --------------- |
| 1         | Foursomes | —            | —       | —          | — (deferred)    |
| 2         | Best Ball | `best_ball`  | 4       | 1          | 4               |
| 3         | Singles   | `match_play` | 8       | 1          | 8               |
| **Total** |           |              |         |            | **12** (est.)   |

#### Individual Competition

- Individual Scoreboard always shown — commissioner marks `stableford` as `primaryScoringBasis`
- No bonus scoring

---

## Individual Scoreboard

The Individual Scoreboard is **always present** on every round and tournament — it is not a competition and requires no configuration. It is computed from raw score events.

### Round-Level Columns

| Column        | Derivation                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Gross strokes | Sum of raw stroke events for all holes                                                                   |
| Net strokes   | Gross minus handicap strokes received per hole                                                           |
| Stableford    | 2-diff per hole, min 0, summed across all holes                                                          |
| Bonus         | Points from `contributor`-mode bonus competitions; `standalone` bonuses shown as a badge (e.g. "NTP H3") |
| Total         | Stableford + contributor bonus points (column only shown if contributor bonuses exist in the round)      |

A player is only included if they have scores for **all holes** in the round's course.

### Tournament-Level (Individual Leaderboard)

The same columns, **aggregated across all finalised rounds** where the player completed all holes. Each player's row shows how many rounds are counted. Rounds that are not yet finalised, or where a player did not complete all holes, are excluded.

### Primary Scoring Basis

The commissioner can designate one column as the **trophy column** — the metric that determines the official winner. This is stored as `primaryScoringBasis` on the round or tournament and is highlighted in the UI. Users can independently show/hide any column for their own view (client-side preference).

---

## Competition Model

Competitions are split into two tables: **games** (scored formats) and **sideGames** (NTP/LD bonus prizes). Both are always **round-scoped**.

```
Game {
  id
  tournamentId
  roundId (NOT NULL)
  groupId (NOT NULL)      // each game belongs to exactly one group
  name
  format                  // discriminant (see below)
  config                  // typed per format (Zod discriminated union)
}

SideGame {
  id
  tournamentId
  roundId (NOT NULL)
  name
  format                  // 'ntp' | 'ld'
  holeNumber (nullable)
  bonusMode               // 'standalone' | 'contributor'
  bonusPoints
  winnerId (nullable)     // → RoundPlayer
}
```

### Game Formats

| Category       | Formats                                      | Requirement                |
| -------------- | -------------------------------------------- | -------------------------- |
| **Team Match** | `match_play`, `best_ball`, `hi_lo`, `rumble` | Tournament must have teams |
| **Game**       | `wolf`, `six_point`, `chair`, `match_play`   | None                       |

Each group may have at most one game. The `groupId` is required, making scope always `'within_group'`.

### Pre-Round Availability Matrix

| Condition                                  | Available match formats                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Tournament has no teams                    | None                                                                 |
| All groups are 4-player, all same team     | Rumble                                                               |
| All groups have exactly 2 players per team | Best Ball, Match Play, Hi-Lo                                         |
| Mixed group makeup                         | All formats shown; a warning indicates which groups will be excluded |

Games (Wolf, Six Point, Chair) are always available regardless of team configuration. Bonus side games (NTP/LD) are always available.

### Format Config Schemas

```ts
const competitionConfigSchema = z.discriminatedUnion('formatType', [
  // --- Matches ---
  z.object({
    formatType: z.literal('match_play'),
    config: z.object({
      pointsPerWin: z.number(),
      pointsPerHalf: z.number(),
      // Explicit 1v1 pairings (roundParticipant IDs) — commissioner picks who faces who
      pairings: z.array(
        z.object({ playerA: z.string().uuid(), playerB: z.string().uuid() }),
      ),
    }),
  }),
  z.object({
    formatType: z.literal('best_ball'),
    config: z.object({
      pointsPerWin: z.number(),
      pointsPerHalf: z.number(),
      // Pairings auto-derived from group + team membership — no explicit config needed
    }),
  }),
  z.object({
    formatType: z.literal('hi_lo'),
    config: z.object({
      pointsPerWin: z.number(),
      pointsPerHalf: z.number(),
      // Pairings auto-derived from group + team membership
    }),
  }),
  z.object({
    formatType: z.literal('rumble'),
    config: z.object({
      pointsPerWin: z.number(),
      // Teams and groups implicit — no explicit pairings
    }),
  }),
  // --- Games ---
  z.object({
    formatType: z.literal('wolf'),
    config: z.object({}),
    // Wolf order = fixed rotation from group participant order
    // Per-hole declarations stored in GameDecisions table
  }),
  z.object({
    formatType: z.literal('six_point'),
    config: z.object({
      scoringBasis: z.enum(['stableford', 'gross']),
      // Fixed 4/2/0 distribution — not configurable
      // Tie-splitting: 3/3/0, 4/1/1, 2/2/2
    }),
  }),
  z.object({
    formatType: z.literal('chair'),
    config: z.object({}),
  }),
  // --- Bonuses ---
  z.object({
    formatType: z.literal('nearest_pin'),
    config: z.object({
      holeNumber: z.number(),
      bonusMode: z.enum(['standalone', 'contributor']),
      bonusPoints: z.number().optional(),
    }),
  }),
  z.object({
    formatType: z.literal('longest_drive'),
    config: z.object({
      holeNumber: z.number(),
      bonusMode: z.enum(['standalone', 'contributor']),
      bonusPoints: z.number().optional(),
    }),
  }),
]);
```

This keeps the database schema flexible (`jsonb`) while giving full type safety at the application layer. Adding a new format means adding a new union member — no schema migration required.

### Scoring Rules

- **All match-based formats use stableford points** — a halved hole (0-0) stays halved, lowest strokes is NOT a tiebreaker
- **Match play declared at point of winning** (e.g. "3&2") but scores continue beyond that for individual scoreboard and bonuses
- **Variable match points** — `pointsPerWin` is configurable per competition, enabling increasing jeopardy across tournament days (e.g. day 1 = 1pt, day 2 = 2pts, day 3 = 4pts)
- **Team membership auto-derived** — Best Ball, Hi-Lo, and Rumble derive team pairings from group membership and `TournamentTeamMembers`; only Match Play requires explicit 1v1 pairings
- **Rounds can exist without competitions** — casual scorecard + Individual Scoreboard is always available

### Bonus Side Games (NTP/LD)

Side games are **award-based**, not score-derived. They are configured during round setup (which hole + type) and awarded by a commissioner during the round.

```
SideGame {
  id
  roundId
  format: 'ntp' | 'ld'
  holeNumber (nullable)
  bonusMode: 'standalone' | 'contributor'
  bonusPoints
  winnerId → RoundPlayer
}
```

Only one winner per side game — awarding a new winner replaces the previous one.

| Mode          | Behaviour                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `standalone`  | Records a winner. Displayed as a badge in the Individual Scoreboard bonus column. No impact on point totals.                              |
| `contributor` | Records a winner AND adds bonus points (e.g. +1 stableford) to the winner's Individual Scoreboard Bonus column. Adds to the Total column. |

### Decisions (Wolf)

Wolf requires per-hole declarations that cannot be derived from scores. These are stored as **append-only immutable events** — the same pattern as score events.

```
Decision {
  id
  gameId
  roundId
  groupId
  holeNumber
  data: jsonb         // Wolf = { wolfPlayerId, partnerPlayerId | null }
  recordedByUserId
  createdAt
}
```

Latest record per `(gameId, groupId, holeNumber)` wins. The Wolf declaration UI appears in the live scoring view on each wolf hole — the wolf selects a partner or confirms going alone before scores are submitted.

### Tournament-Level Team Leaderboard

The team leaderboard is **auto-computed** from round-level match competition results — no separate configuration needed.

- Iterates all finalised rounds
- Sums match points won per team (from `match_play`, `best_ball`, `hi_lo`, `rumble` competitions)
- Groups by `TournamentTeam` via `TournamentTeamMembers`
- Only shown on the tournament page if teams are configured

---

## Scoring Engine

All scoring logic lives in `src/lib/domain/`.

**Pure TypeScript. No DB access. No framework coupling.**

### Dispatcher

```ts
// src/lib/domain/index.ts
calculateCompetitionResults({
  competition,        // { id, name, config: CompetitionConfig }
  holes,              // HoleData[] (holeNumber, par, strokeIndex)
  participants,       // ParticipantData[] (with effective handicaps + playing handicaps pre-resolved)
  scores,             // ResolvedScore[] (latest event per participant+hole)
  teams?,             // TeamData[] (for match formats — teamId + memberParticipantIds)
  gameDecisions?,     // GameDecision[] (for Wolf)
}): CompetitionResult
```

### Format Engines

| Format         | File            | Mechanism                                                                                                                         |
| -------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Match Play** | `match-play.ts` | 1v1 using stableford points per hole. Declared at point (e.g. "3&2"). Halved holes stay halved. `within_group` scope              |
| **Best Ball**  | `best-ball.ts`  | 2v2 team. Best stableford from each pair compared per hole. Same match logic as match play. `within_group` scope                  |
| **Hi-Lo**      | `hi-lo.ts`      | 2v2 team. Two parallel matches per hole: high ball (best stableford each side) + low ball (worst each side). `within_group` scope |
| **Rumble**     | `rumble.ts`     | 4v4 group-vs-group. Escalating scores count per hole range (see below). Aggregate team total, highest wins. `all` scope           |
| **Wolf**       | `wolf.ts`       | Within-group individual game. Per-hole wolf declarations. Standard 2/4/2 points. `within_group` scope                             |
| **Six Point**  | `six-point.ts`  | Within-group individual game. 3-player, fixed 4/2/0 distribution, stableford or gross basis. Tie-splitting. `within_group` scope  |
| **Chair**      | `chair.ts`      | Within-group individual game. State machine — win outright to take chair, 1pt/hole held, tie retains. `within_group` scope        |
| **NTP / LD**   | `bonus.ts`      | Award-based, not score-derived. Helpers for UI dropdowns                                                                          |

### Rumble Scoring Detail

The Rumble escalates how many scores count per hole:

| Holes | Scores counted per group of 4     |
| ----- | --------------------------------- |
| 1–6   | Best 1 stableford score           |
| 7–12  | Best 2 stableford scores (summed) |
| 13–17 | Best 3 stableford scores (summed) |
| 18    | All 4 stableford scores (summed)  |

Hole numbers refer to actual course hole numbers on the card. Each group produces a group aggregate. All groups from the same team are summed for the team total. Higher team total wins.

Constraints: all groups must have exactly 4 players, all from the same team.

### Wolf Scoring Detail

Wolf order is determined by fixed rotation from group participant order (Player 1 on holes 1, 5, 9, 13, 17; Player 2 on holes 2, 6, 10, 14, 18; etc.).

**Standard 2/4/2 points:**

| Scenario                                              | Points                                        |
| ----------------------------------------------------- | --------------------------------------------- |
| Wolf picks partner — wolf+partner win (2v2 best ball) | Wolf + partner: 2 pts each; others: 0         |
| Wolf picks partner — others win                       | Each of the other 2: 2 pts; wolf + partner: 0 |
| Wolf picks partner — tie                              | No points                                     |
| Lone wolf wins (wolf stableford > best of other 3)    | Wolf: 4 pts; others: 0                        |
| Lone wolf loses                                       | Each of the other 3: 2 pts; wolf: 0           |
| Lone wolf ties                                        | No points                                     |

### Key Design Decisions

- **All match formats use stableford** — not raw strokes. A hole where both players score 0 stableford points is halved, period
- **Matches are declared but scoring continues** — the engine tracks when a match is mathematically decided (e.g. "3&2") but doesn't stop score entry. Other competitions depend on all holes being scored
- **Variable match points** — `pointsPerWin` / `pointsPerHalf` per competition allows increasing jeopardy across days
- **Pairings auto-derived for team formats** — Best Ball, Hi-Lo, and Rumble derive team pairings from group membership; only Match Play needs explicit pairings

### Pre-Resolution

The caller resolves effective handicaps _before_ passing data to the engine:

```ts
effectiveHandicap =
  roundParticipant.handicapOverride ??
  tournamentParticipant.handicapOverride ??
  roundParticipant.handicapSnapshot;
```

Playing handicap is then derived: `Math.round(effectiveHandicap)`, clamped 0–54.

The engine never touches the database or knows about override precedence. It receives pre-resolved inputs and returns deterministic outputs.

---

## Model Mapping & Design Reconciliation

This section records how the original scenario-based design (raw notes) maps to the current system, and what was resolved during implementation.

### What Aligns Well

| Their concept                                 | Our model                                                            |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Tournament, Players, Teams                    | `tournaments`, `players`, `teams`                                    |
| Rounds, Groups                                | `rounds`, `groups`, `roundPlayers` (with `groupId`)                  |
| Individual hole scores                        | `scoreEvents` (append-only)                                          |
| Individual competition (aggregate stableford) | Auto-computed Individual Scoreboard (not a `games` row)              |
| Team competition (match wins)                 | `games` with a team format (`best_ball`, `match_play`, etc.)         |
| Points per win / per half                     | `pointsPerWin` / `pointsPerHalf` on match configs                    |
| Multiple competitions simultaneously          | Multiple `games` per round + multiple `sideGames`                    |
| Per-hole game decisions (Wolf)                | `decisions` table (append-only; latest per gameId+groupId+hole wins) |

### Resolved Gaps

1. **Round-level format label** ✅ — Optional `format` text field on `rounds` for display only (e.g. "Round 1: Irish Rumble"). Scoring logic stays on competitions.

2. **Per-round competition constraints** ✅ — At most 1 match + 1 game + unlimited bonuses per round. Validated at creation time.

3. **Irish Rumble** ✅ — `rumble` format engine with escalating per-hole scoring. `all` scope. Groups must be 4-player, all same team.

4. **Group vs group scope** ✅ — Rumble uses `all` scope (no new `between_groups` scope needed). Team pairings auto-derived from group + team membership, not explicit config.

5. **Bonus dual-mode (standalone vs contributor)** ✅ — `bonusMode` (`standalone` | `contributor`) and `bonusPoints` on NTP/LD configs.

6. **Variable points per round** ✅ — `pointsPerWin` is per competition, each round has its own competitions.

7. **Individual scoreboard as a competition** ✅ — Individual Scoreboard is auto-computed; `stableford` and `stroke_play` competition types retired from the UI.

8. **`participantType` field** ✅ — Renamed to `competitionCategory` (`'match' | 'game' | 'bonus'`).

9. **`roundTeams` / `roundTeamMembers`** ✅ — Dropped. These tables were never written to in practice. Teams are tournament-level only.

### Resolved Gaps (All Complete)

All items identified during reconciliation have been implemented:

1. **`decisions` table** ✅ — Schema in `src/db/schema.ts`. Server functions `submitDecisionFn` / `getDecisionsFn` / `getAllDecisionsFn` in `src/lib/decisions.server.ts`.

2. **`scoringBasis` field** ✅ — `scoring_basis` enum column on `tournaments`. `trackIndividualScoreboard` flag on `tournaments`.

3. **Game / SideGame split** ✅ — `games` table stores scored formats; `sideGames` table stores NTP/LD with inline winner.

4. **Wolf declaration UI** ✅ — `WolfDeclarationControl` component in `src/components/pages/live-scoring-page/components/wolf-declaration-control.tsx`.

5. **Hi-Lo engine** ✅ — `src/lib/domain/hi-lo.ts`.

6. **Wolf engine** ✅ — `src/lib/domain/wolf.ts`.

7. **Six Point engine** ✅ — `src/lib/domain/six-point.ts` (3-player, fixed 4/2/0, stableford/gross basis).

8. **Chair engine** ✅ — `src/lib/domain/chair.ts`.

9. **Auto-computed leaderboards** ✅ — `getIndividualScoreboardFn` / `getTournamentLeaderboardFn` in `src/lib/scoreboards.server.ts`.

10. **Foursomes** — Still deferred. See `TODO.md` → Foursomes.
