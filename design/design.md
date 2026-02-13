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
Tournament
  → TournamentParticipants → Person
  → TournamentTeams (optional, persistent team identities)
  → Competitions
  → Rounds
    → RoundParticipants (with handicap snapshot)
      → ScoreEvents
    → RoundTeams (optional, per-round composition — may reference a TournamentTeam)
```

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

| Entity                | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| Tournament            | Top-level container for the event                                  |
| Round                 | A single round of golf within a tournament                         |
| Course                | A golf course (shared library)                                     |
| CourseHole            | Hole-level data for a course (par, SI, yardage)                    |
| Person                | A human identity (guest or registered) with handicap               |
| TournamentParticipant | Links a Person to a Tournament (+ HC override)                     |
| RoundParticipant      | Links a TournamentParticipant to a Round (+ HC snapshot)           |
| TournamentTeam        | A persistent team identity across the tournament                   |
| RoundTeam             | Per-round team composition (optionally linked to a TournamentTeam) |
| ScoreEvent            | An immutable record of strokes on a hole                           |
| Competition           | A scoring format applied to raw data                               |

### Key Relationships

- Tournament → many Rounds
- Tournament → many TournamentParticipants → Person
- Tournament → many TournamentTeams (optional)
- Tournament → many Competitions
- Round → one Course
- Round → many RoundParticipants → TournamentParticipant
- Round → many RoundTeams → many RoundParticipants
- RoundTeam → one TournamentTeam (optional)
- Round → many ScoreEvents
- ScoreEvent → one RoundParticipant + one Round + one Hole

> **Why RoundParticipant?** Not everyone plays every round. Handicap snapshots are per-round. This is the natural join.

> **Why both TournamentTeam and RoundTeam?** `TournamentTeam` is a persistent identity ("Team Europe") that a commissioner sets up once. `RoundTeam` is the actual composition for a specific round — it _may_ reference a `TournamentTeam`, or it may be a one-off grouping (e.g., a scramble). The scoring engine only sees `RoundTeam`. `TournamentTeam` is a convenience for setup and display.

---

## Competition Model

Competitions are **configuration objects**, not stored results.

```
Competition {
  id
  tournamentId
  name
  scope: "round" | "tournament"
  formatType           // discriminant: "stableford" | "strokePlay" | "matchPlay" | "scramble" | "nearestPin" | ...
  configJson           // typed per formatType (see below)
  roundId (nullable)   // null = tournament-wide, set = round-scoped
}
```

The `configJson` field is validated using a **Zod discriminated union** keyed on `formatType`:

```ts
const StablefordConfig = z.object({ ... })
const MatchPlayConfig = z.object({ ... })
const NearestPinConfig = z.object({ holeNumber: z.number(), ... })

const CompetitionConfig = z.discriminatedUnion("formatType", [
  z.object({ formatType: z.literal("stableford"), config: StablefordConfig }),
  z.object({ formatType: z.literal("matchPlay"), config: MatchPlayConfig }),
  z.object({ formatType: z.literal("nearestPin"), config: NearestPinConfig }),
  // ...
])
```

This keeps the database schema flexible (`jsonb`) while giving us **full type safety** at the application layer. Adding a new format means adding a new union member — no schema migration required.

Examples:

- Round 1 Stableford
- Team Match Play (full tournament)
- Overall Gross Stroke Play
- Nearest the Pin — R2 Hole 8
- Singles Stableford

Multiple competitions run simultaneously over the **same raw score events**. Adding or changing a competition never requires re-entering scores.

---

## Scoring Engine

All scoring logic lives in `src/lib/domain/`.

**Pure TypeScript. No DB access. No framework coupling.**

```ts
calculateCompetitionResults({
  competition,        // Competition config (with typed configJson)
  scoreEvents,        // Raw ScoreEvents for the relevant round(s)
  roundParticipants,  // With effective handicaps already resolved
  courseData,         // Course + CourseHoles
  roundTeams?,        // Optional, for team-based formats
}): CompetitionResult
```

The caller resolves effective handicaps _before_ passing data to the engine:

```ts
effectiveHandicap =
  roundParticipant.handicapOverride ??
  tournamentParticipant.handicapOverride ??
  roundParticipant.handicapSnapshot
```

The engine never touches the database or knows about override precedence. It receives pre-resolved inputs and returns deterministic outputs.

This enables:

- Recalculation at any time
- Format changes mid-tournament
- Deterministic, testable outputs
- Full unit testing with no infrastructure dependencies

---

## Roles & Permissions

### Global

| Role  | Capabilities                                  |
| ----- | --------------------------------------------- |
| Admin | App-wide config, course management, user mgmt |

### Tournament-Scoped

| Role         | Capabilities                                                              |
| ------------ | ------------------------------------------------------------------------- |
| Commissioner | Configure tournament, assign groups/markers, lock rounds, override scores |
| Marker       | Enter/edit scores for assigned group                                      |
| Player       | Enter/edit own score (if format allows)                                   |
| Spectator    | Read-only access                                                          |

Permissions are enforced at **both** layers:

- **Client-side** — UI gating (hide/disable controls)
- **Server-side** — Supabase RLS + API validation

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
