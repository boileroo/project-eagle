# Golf Scoring Engine – Architecture Overview

## Vision

A social golf scoring app for **golf holidays with flexible tournament formats**.

- Multi-round tournaments with multiple simultaneous competitions
- Multiple scoring formats (matches, games, stableford, etc.)
- Individual and team competitions running over the same raw data
- Offline-first with live updates when connected
- Formats can change at any point — results are always re-derived
- Stores only raw facts; all results are projections

> This is not a CRUD golf app.
> This is an **event-driven golf competition engine** with UI on top.

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

**TournamentParticipant** — links a person to a tournament:

```
TournamentParticipant { id, tournamentId, personId, handicapOverride (nullable) }
```

- `handicapOverride` — a commissioner may set this to override the player's handicap for the entire tournament

**RoundParticipant** — links a tournament participant to a specific round:

```
RoundParticipant { id, roundId, tournamentParticipantId, handicapSnapshot, handicapOverride (nullable) }
```

- `handicapSnapshot` — captured from `Person.currentHandicap` when the round is created
- `handicapOverride` — a commissioner may override for this specific round
- Not every participant plays every round (golf holidays have rest days, late arrivals, etc.)

**Effective handicap** for scoring is resolved as:

```
RoundParticipant.handicapOverride
  ?? TournamentParticipant.handicapOverride
    ?? RoundParticipant.handicapSnapshot
```

This allows:

- Guests to participate and persist across rounds
- Guests to claim an account at any time (link `userId`)
- People to be reused across tournaments
- Players to manage their own handicap over time
- Commissioners to override handicaps at tournament or round level
- Past rounds to be unaffected by future handicap changes
- Lifetime stats to be built later

> Guests are not a role. They are a `Person` without a `userId`.

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
  → TournamentParticipants → Person
  → TournamentTeams (optional, persistent team identities)
    → TournamentTeamMembers → TournamentParticipant
  → Rounds
    → RoundGroups (playing groups / fourballs, 1–4 players each)
    → RoundParticipants (with handicap snapshot, assigned to a group)
      → ScoreEvents
    → Competitions (optional — matches, games, bonuses)
      → BonusAwards (for NTP/LD competitions)
      → GameDecisions (for Wolf — per-hole declarations)
```

Every round belongs to a tournament (`tournament_id` NOT NULL). A casual round is simply a 1-round tournament.

Teams are **tournament-level only** — they are fixed for the duration of the tournament. Playing groups (who physically plays together in a round) may change round to round; team membership does not.

Each round stores:

- Course reference
- Round number / date
- Status: `draft` | `open` | `locked` | `finalized`
- `primaryScoringBasis` — the column the commissioner designates as the trophy metric (`gross_strokes` | `net_strokes` | `stableford` | `total` | null)

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

| Entity                | Purpose                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| Tournament            | Top-level container (mandatory, even for a single round)                   |
| Round                 | A single round of golf within a tournament                                 |
| RoundGroup            | A playing group / fourball within a round (1–4 players)                    |
| Course                | A golf course (shared library)                                             |
| CourseHole            | Hole-level data for a course (par, SI, yardage)                            |
| Person                | A human identity (guest or registered) with handicap                       |
| TournamentParticipant | Links a Person to a Tournament (+ HC override)                             |
| TournamentTeam        | A persistent team identity for the tournament                              |
| TournamentTeamMember  | Links a TournamentParticipant to a TournamentTeam                          |
| RoundParticipant      | Links a TournamentParticipant to a Round + Group (+ HC snapshot)           |
| ScoreEvent            | An immutable record of strokes on a hole                                   |
| Competition           | A round-scoped scoring format config (match, game, or bonus)               |
| BonusAward            | Winner of a bonus competition (NTP/LD) — single award per comp             |
| GameDecision          | An immutable record of a per-hole game decision (e.g. Wolf partner choice) |

### Key Relationships

- Tournament → many Rounds (mandatory, `tournament_id` NOT NULL)
- Tournament → many TournamentParticipants → Person
- Tournament → many TournamentTeams → TournamentTeamMembers → TournamentParticipants
- Round → one Course
- Round → many RoundGroups (playing fourballs)
- Round → many RoundParticipants → TournamentParticipant
- RoundParticipant → one RoundGroup (nullable)
- Round → many Competitions → BonusAwards / GameDecisions

> **Why RoundParticipant?** Not everyone plays every round. Handicap snapshots are per-round. This is the natural join.

> **Why RoundGroup?** Groups are the operational unit on the course — who physically plays together. They are distinct from teams (a group of 4 may contain 2 players from each team).

> **Why tournament-level teams only?** Teams are a persistent identity for the tournament ("Team Europe"). Playing partners change round to round but team membership does not. Having a single source of truth avoids sync and consistency problems.

---

## Individual Scoreboard

The Individual Scoreboard is **always present** on every round and tournament — it is not a competition and requires no configuration. It is computed from raw score events.

### Round-level columns

| Column        | Derivation                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Gross strokes | Sum of raw stroke events for all holes                                                                   |
| Net strokes   | Gross minus handicap strokes received per hole                                                           |
| Stableford    | 2-diff per hole, min 0, summed across all holes                                                          |
| Bonus         | Points from `contributor`-mode bonus competitions; `standalone` bonuses shown as a badge (e.g. "NTP H3") |
| Total         | Stableford + contributor bonus points (column only shown if contributor bonuses exist in the round)      |

A player is only included if they have scores for **all holes** in the round's course.

### Tournament-level (Individual Leaderboard)

The same columns, **aggregated across all finalised rounds** where the player completed all holes. Each player's row shows how many rounds are counted. Rounds that are not yet finalised, or where a player did not complete all holes, are excluded.

### Primary scoring basis

The commissioner can designate one column as the **trophy column** — the metric that determines the official winner. This is stored as `primaryScoringBasis` on the round or tournament and is highlighted in the UI. Users can independently show/hide any column for their own view (client-side preference).

---

## Competition Model

Competitions are **configuration objects**, not stored results. They are always **round-scoped**.

```
Competition {
  id
  tournamentId
  roundId (NOT NULL)        // always bound to a specific round
  name
  competitionCategory       // "match" | "game" | "bonus"
  groupScope                // "all" | "within_group"
  formatType                // discriminant (see below)
  configJson                // typed per formatType (Zod discriminated union)
}
```

### Competition Categories

| Category  | Formats                                      | Max per round | Requirement                |
| --------- | -------------------------------------------- | ------------- | -------------------------- |
| **Match** | `match_play`, `best_ball`, `hi_lo`, `rumble` | 1             | Tournament must have teams |
| **Game**  | `wolf`, `six_point`, `chair`                 | 1             | None                       |
| **Bonus** | `nearest_pin`, `longest_drive`               | Unlimited     | None                       |

A round may have at most 1 match and at most 1 game competition simultaneously. If both are configured, the UI warns that tournament-level team scoring will not aggregate (since team and individual game results are incompatible in the leaderboard).

> Note: `stableford` and `stroke_play` were previous competition format types. They are retired — individual scoring is now always provided by the auto-computed Individual Scoreboard.

### Pre-Round Availability Matrix

The competition setup UI filters available formats based on the round's actual group composition:

| Condition                                  | Available match formats                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Tournament has no teams                    | None                                                                 |
| All groups are 4-player, all same team     | Rumble                                                               |
| All groups have exactly 2 players per team | Best Ball, Match Play, Hi-Lo                                         |
| Mixed group makeup                         | All formats shown; a warning indicates which groups will be excluded |

Games (Wolf, Six Point, Chair) are always available regardless of team configuration. Bonuses (NTP/LD) are always available.

If no groups have been set up yet, match formats are not shown — group composition must be known first.

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
      // 4 values summing to 6, one per finishing position
      distribution: z.array(z.number()).length(4),
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

This keeps the database schema flexible (`jsonb`) while giving us **full type safety** at the application layer. Adding a new format means adding a new union member — no schema migration required.

### Scoring Rules

- **All match-based formats use stableford points** — a halved hole (0-0) stays halved, lowest strokes is NOT a tiebreaker
- **Match play declared at point of winning** (e.g. "3&2") but scores continue beyond that for individual scoreboard and bonuses
- **Variable match points** — `pointsPerWin` is configurable per competition, enabling increasing jeopardy across tournament days (e.g. day 1 = 1pt, day 2 = 2pts, day 3 = 4pts)
- **Team membership auto-derived** — Best Ball, Hi-Lo, and Rumble derive team pairings from group membership and `TournamentTeamMembers`; only Match Play requires explicit 1v1 pairings
- **Rounds can exist without competitions** — casual scorecard + Individual Scoreboard is always available

### Bonus Competitions (NTP/LD)

Bonus competitions are **award-based**, not score-derived. They are configured during round setup (which hole + type) and awarded by a commissioner or marker during the round via a dropdown on the scoring UI for that hole.

```
BonusAward {
  id
  competitionId
  roundParticipantId
  awardedByUserId
  createdAt
}
```

Only one winner per bonus competition — awarding a new winner replaces the previous one.

**Bonus modes:**

| Mode          | Behaviour                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `standalone`  | Records a winner. Displayed as a badge in the Individual Scoreboard bonus column. No impact on point totals.                              |
| `contributor` | Records a winner AND adds bonus points (e.g. +1 stableford) to the winner's Individual Scoreboard Bonus column. Adds to the Total column. |

### Game Decisions (Wolf)

Wolf requires per-hole declarations that cannot be derived from scores. These are stored as **append-only immutable events** — the same pattern as score events.

```
GameDecision {
  id
  competitionId
  roundId
  holeNumber
  data: jsonb         // format-specific: Wolf = { wolfPlayerId, partnerPlayerId | null }
  recordedByUserId
  createdAt
}
```

Latest record per `(competitionId, holeNumber)` wins. The Wolf declaration UI appears in the live scoring view on each wolf hole — the wolf selects a partner or confirms going alone before scores are submitted.

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
| **Six Point**  | `six-point.ts`  | Within-group individual game. Configurable 4-value distribution summing to 6. Tie-splitting. `within_group` scope                 |
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

Constraints: all groups must have exactly 4 players, all from the same team. Only available in team-based tournaments or standalone rounds with teams.

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

## Roles & Permissions

### Tournament-Scoped

| Role         | Capabilities                                                                          |
| ------------ | ------------------------------------------------------------------------------------- |
| Commissioner | Configure tournament, manage teams, lock rounds, override scores, manage competitions |
| Marker       | Enter/edit scores for their group, award bonus comps, record Wolf declarations        |
| Player       | Enter/edit own score, self-join tournaments                                           |
| Spectator    | Read-only access                                                                      |

Permissions are enforced at **both** layers:

- **Client-side** — UI gating via `isCommissioner` check (hide/disable admin controls)
- **Server-side** — `requireCommissioner(tournamentId)` in `src/lib/auth.helpers.ts` on all mutations (tournaments, rounds, teams, competitions). Score entry uses `requireAuth()` with role verification.

---

## Authentication

Authentication is handled by **Supabase Auth** and is required from day one — RLS policies depend on it.

### Auth Model

- Supabase manages `auth.users` (email, password hash, sessions)
- Our `profiles` table extends `auth.users` with app-specific data
- The `Person` entity links to `profiles` via `userId` (nullable for guests)

### Key Flows

- **Sign up / Sign in** — email + magic link (or password, TBD)
- **Guest creation** — authenticated users create `Person` records without a `userId` for guests in their group
- **Guest claiming** — a guest can later sign up and link their `Person` to a new `userId`
- **Session management** — Supabase handles tokens, refresh, and expiry

### RLS Dependency

Every table with user-scoped data uses Supabase RLS policies that reference `auth.uid()`. Without auth, there is no data access control. This is not a future feature — it's foundational.

---

## Offline-First Strategy

### Client Flow

1. User enters a score
2. Local store (IndexedDB via TanStack Query persister) writes the event immediately
3. UI updates optimistically
4. Background sync pushes event to Supabase
5. Supabase persists the event
6. Realtime subscription broadcasts to other connected clients

### Conflict Resolution

- Append-only events — no destructive writes
- Latest `createdAt` timestamp per `(roundId, participantId, holeNumber)` wins
- No merge logic needed

---

## Tech Stack

| Layer             | Choice                                   |
| ----------------- | ---------------------------------------- |
| Package Manager   | Yarn                                     |
| Framework         | TanStack Start                           |
| Routing / Data    | TanStack Router + TanStack Query         |
| Database          | Supabase (Postgres)                      |
| ORM               | Drizzle                                  |
| Styling           | Tailwind CSS                             |
| UI Components     | shadcn/ui                                |
| Local Persistence | IndexedDB (via TanStack Query persister) |

### Key Tech Decisions

**Drizzle** — Strong TypeScript types, SQL-like syntax (transparent, predictable), lightweight vs Prisma, works well with Supabase Postgres.

**Supabase** — Hosted Postgres, realtime subscriptions, built-in auth (foundational — required for RLS), free tier, pairs well with Drizzle.

**TanStack Query + IndexedDB** — Caching, background revalidation, offline mutation queue, ideal for unreliable mobile signal.

---

## Requirements

### Functional

- Create and configure tournaments
- Define teams and individual participants
- Support multiple rounds per tournament
- Support multiple concurrent competitions with different scoring formats
- Handle both team and individual scoring
- Live leaderboard updates via realtime subscriptions

### Technical

- Offline resilience (works with no signal)
- Eventual consistency when connectivity returns
- Mobile-friendly (primary use case is on-course)
- Deployable to free hosting tier
- Type-safe end to end (DB → API → client)

---

## Risks & Constraints

| Risk                         | Mitigation / Notes                                  |
| ---------------------------- | --------------------------------------------------- |
| iOS PWA limitations          | Test early; may need native wrapper later           |
| IndexedDB storage quotas     | Score events are small; monitor usage               |
| Sync conflicts (poor signal) | Append-only model avoids destructive conflicts      |
| Complex scoring rules        | Pure-function engine is easy to extend and test     |
| Format flexibility           | `configJson` on Competition allows arbitrary config |

---

## Guiding Principles

1. **Store facts, derive everything else**
2. **Offline-first from day one**
3. **Type safety over convenience**
4. **Keep schema flexible** — formats will evolve
5. **Avoid premature backend complexity**
6. **Keep hosting free initially**
