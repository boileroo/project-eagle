# Golf Scoring Engine – Architecture Overview

## Vision

A social golf scoring app for **golf holidays with flexible tournament formats**.

- Multi-round tournaments with multiple simultaneous competitions
- Multiple scoring formats (stableford, match play, scramble, etc.)
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

## Domain Model

### Tournament Structure

```
Tournament (mandatory)
  → TournamentParticipants → Person
  → TournamentTeams (optional, persistent team identities)
  → Competitions
  → Rounds
    → RoundGroups (playing groups / fourballs, 1–4 players each)
    → RoundParticipants (with handicap snapshot, assigned to a group)
      → ScoreEvents
    → RoundTeams (optional, per-round composition — may reference a TournamentTeam)
```

Every round belongs to a tournament (`tournament_id` NOT NULL). A casual round is simply a 1-round tournament.

Each round stores:

- Course reference
- Round number / date
- Status: `draft` | `open` | `locked` | `finalized`

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

| Entity                | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| Tournament            | Top-level container (mandatory, even for a single round)                     |
| Round                 | A single round of golf within a tournament                                   |
| RoundGroup            | A playing group / fourball within a round (1–4 players)                      |
| Course                | A golf course (shared library)                                               |
| CourseHole            | Hole-level data for a course (par, SI, yardage)                              |
| Person                | A human identity (guest or registered) with handicap                         |
| TournamentParticipant | Links a Person to a Tournament (+ HC override)                               |
| RoundParticipant      | Links a TournamentParticipant to a Round + Group (+ HC snapshot)             |
| TournamentTeam        | A persistent team identity across the tournament                             |
| RoundTeam             | Per-round team composition (optionally linked to a TournamentTeam)           |
| ScoreEvent            | An immutable record of strokes on a hole                                     |
| Competition           | A round-scoped scoring format config (up to 1 team + 1 individual per round) |
| BonusAward            | Winner of a bonus competition (NTP/LD) — single award per comp               |
| TournamentStanding    | Tournament-wide aggregation config (rolls up round competitions)             |

### Key Relationships

- Tournament → many Rounds (mandatory, `tournament_id` NOT NULL)
- Tournament → many TournamentParticipants → Person
- Tournament → many TournamentTeams (optional)
- Tournament → many Competitions (via rounds)
- Tournament → many TournamentStandings (0, 1, or 2 — individual and/or team)
- Round → one Course
- Round → many RoundGroups (playing fourballs)
- Round → many RoundParticipants → TournamentParticipant
- RoundParticipant → one RoundGroup (nullable)
- Round → many RoundTeams → many RoundParticipants
- RoundTeam → one TournamentTeam (optional)
- Round → many ScoreEvents
- ScoreEvent → one RoundParticipant + one Round + one Hole

> **Why RoundParticipant?** Not everyone plays every round. Handicap snapshots are per-round. This is the natural join.

> **Why RoundGroup?** Groups are the operational unit on the course — who physically plays together. They are distinct from teams (a group of 4 may contain 2 players from each team). Competitions can scope their results to `within_group` or `all` players.

> **Why both TournamentTeam and RoundTeam?** `TournamentTeam` is a persistent identity ("Team Europe") that a commissioner sets up once. `RoundTeam` is the actual composition for a specific round — it _may_ reference a `TournamentTeam`, or it may be a one-off grouping (e.g., a scramble). The scoring engine only sees `RoundTeam`. `TournamentTeam` is a convenience for setup and display.

---

## Competition Model

Competitions are **configuration objects**, not stored results. They are always **round-scoped** and classified as either **individual** or **team**.

```
Competition {
  id
  tournamentId
  roundId (NOT NULL)     // always bound to a specific round
  name
  participantType        // "individual" | "team"
  groupScope             // "all" | "within_group"
  formatType             // discriminant: "stableford" | "stroke_play" | "match_play" | "best_ball" | "nearest_pin" | "longest_drive"
  configJson             // typed per formatType (see below)
}
```

The `configJson` field is validated using a **Zod discriminated union** keyed on `formatType` (defined in `src/lib/competitions.ts`):

**Per-round constraints:** Each round allows at most **1 team competition**, at most **1 individual competition**, and **any number of bonus competitions** (NTP/LD). This is validated at competition creation time.

```ts
const competitionConfigSchema = z.discriminatedUnion('formatType', [
  z.object({
    formatType: z.literal('stableford'),
    config: z.object({}),
  }),
  z.object({
    formatType: z.literal('stroke_play'),
    config: z.object({
      scoringBasis: z.enum(['net_strokes', 'gross_strokes']),
    }),
  }),
  z.object({
    formatType: z.literal('match_play'),
    config: z.object({
      pointsPerWin: z.number(),
      pointsPerHalf: z.number(),
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
      pairings: z.array(
        z.object({ teamA: z.string().uuid(), teamB: z.string().uuid() }),
      ),
    }),
  }),
  z.object({
    formatType: z.literal('nearest_pin'),
    config: z.object({ holeNumber: z.number() }),
  }),
  z.object({
    formatType: z.literal('longest_drive'),
    config: z.object({ holeNumber: z.number() }),
  }),
]);
```

This keeps the database schema flexible (`jsonb`) while giving us **full type safety** at the application layer. Adding a new format means adding a new union member — no schema migration required.

### Scoring Rules

- **All match-based formats use stableford points** — a halved hole (0-0) stays halved, lowest strokes is NOT a tiebreaker
- **Match play declared at point of winning** (e.g. "3&2") but scores continue beyond that for individual competitions and bonuses
- **Variable match points** — `pointsPerWin` is configurable per competition, enabling increasing jeopardy across tournament days (e.g. day 1 = 1pt, day 2 = 2pts, day 3 = 4pts)
- **Teams derived from tournament-level teams** with filtering to ensure valid formats (e.g. best ball needs 2v2)
- **Rounds can exist without competitions** — casual scorecard is fine

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

| Mode          | Behaviour                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `standalone`  | Records a winner. Displayed as a separate award. No impact on standings.                                              |
| `contributor` | Records a winner AND adds bonus points (e.g. +1 stableford) to the winner's individual tournament standing aggregate. |

The commissioner selects the mode when creating the bonus competition. Both modes can coexist in the same round (e.g. NTP as standalone, LD as contributor).

### Tournament Standings (Aggregation)

Tournament-level leaderboards are configured separately from round competitions. A tournament can have 0, 1, or 2 standings (individual and/or team).

```
TournamentStanding {
  id
  tournamentId
  name
  participantType        // "individual" | "team"
  aggregationConfig      // Zod discriminated union keyed on "method"
}
```

Aggregation methods (extensible via discriminated union):

- **sum_stableford** — sum stableford points across all rounds (individual)
- **lowest_strokes** — sum net or gross strokes across all rounds (individual)
- **match_wins** — count match wins across all rounds (individual or team), configurable points per win/half

Results are **derived at display time** from round-level competition results — nothing is persisted.

### Group Scope

Competitions have a `groupScope` that determines how they relate to playing groups:

| Value          | Meaning                                             | Example                              |
| -------------- | --------------------------------------------------- | ------------------------------------ |
| `all`          | One leaderboard across all players in the round     | Individual stableford                |
| `within_group` | Runs independently per group, results aggregated up | Match play singles within a fourball |

For `within_group` competitions:

- The scoring engine runs once per group with filtered participants/scores
- Per-group results aggregate to round level (e.g. "Group 1: Europe 2, USA 2")
- Round-level results aggregate to tournament via `TournamentStandings`

Pairings for match-based formats can be **auto-derived** from group + team membership, then tweaked by the commissioner. The helper generates cross-team pairings within a group (e.g. 2 Europe vs 2 USA in a group of 4).

### Examples

- Round 1 Individual Stableford (individual, all, round-scoped)
- Match Play Singles Within Groups (individual, within_group, round-scoped)
- Best Ball — Team A vs Team B Within Groups (team, within_group, 2pts for win)
- Nearest the Pin — Hole 8 (individual, all, round-scoped)
- Singles Match Play — Tom vs James (individual, all, round-scoped, 4pts for day 3 jeopardy)
- Overall Stableford (tournament standing, sum_stableford)
- Team Championship (tournament standing, match_wins)

Multiple competitions run simultaneously over the **same raw score events**. Adding or changing a competition never requires re-entering scores.

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
  teams?,             // TeamData[] (for team-based formats)
}): CompetitionResult
```

### Format Engines

| Format          | File             | Mechanism                                                                                                            |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Stableford**  | `stableford.ts`  | Net points per hole (0-5 scale), count-back tiebreaker (last 9/6/3/1 holes)                                          |
| **Stroke Play** | `stroke-play.ts` | Gross or net total, ranked ascending                                                                                 |
| **Match Play**  | `match-play.ts`  | 1v1 using stableford points per hole. Declared at point (e.g. "3&2"). Halved holes stay halved (0-0 = no tiebreaker) |
| **Best Ball**   | `best-ball.ts`   | 2v2 team. Best stableford from each pair compared per hole. Same match logic as match play                           |
| **NTP / LD**    | `bonus.ts`       | Award-based, not score-derived. Helpers for UI dropdowns                                                             |

### Key Design Decisions

- **All match formats use stableford** — not raw strokes. A hole where both players score 0 stableford points is halved, period
- **Matches are declared but scoring continues** — the engine tracks when a match is mathematically decided (e.g. "3&2") but doesn't stop score entry. Other competitions (individual stableford, bonuses) depend on all holes being scored
- **Variable match points** — `pointsPerWin` / `pointsPerHalf` per competition allows increasing jeopardy across days

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
| Marker       | Enter/edit scores for their group, award bonus comps                                  |
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
