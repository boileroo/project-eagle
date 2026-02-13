# Project Eagle – Build Plan

## Current State

The project has a working TanStack Start boilerplate: Vite, React 19, TanStack Router (file-based routing with only `/`), Drizzle ORM wired to Supabase Postgres, Supabase clients (browser + SSR), Tailwind v4 + shadcn/ui configured (but zero components installed), auth Zod schemas, and TanStack DB + Query dependencies.

None of the domain has been built. The schema has only `profiles` and a placeholder `todos` table. No routes, no domain logic, no auth flows, no UI components.

---

## Phase 1 — Auth & Schema Foundation

Everything depends on authenticated users and the core data model. Auth and schema are built together because RLS policies require both.

### 1.1 Supabase Auth

- Sign-up and login pages (email + password to start)
- Auth middleware on routes — redirect unauthenticated users
- Session handling in `__root.tsx` — load user on app init, pass via router context
- Protected route wrapper / layout route
- Zod schemas for login/signup already exist in `src/lib/validators.ts`

### 1.2 Full Drizzle Schema

Replace the placeholder `todos` table in `src/db/schema.ts` with all domain entities:

- `profiles` (keep as-is — extends `auth.users`)
- `persons`
- `courses` + `courseHoles`
- `tournaments`
- `rounds`
- `tournamentParticipants`
- `roundParticipants`
- `tournamentTeams`
- `roundTeams` + `roundTeamMembers`
- `scoreEvents`
- `competitions`

Generate Zod insert/select schemas for each table. Define TypeScript types.

### 1.3 First Migration

- `yarn db:generate` + `yarn db:migrate` to push the schema to Supabase

### 1.4 Baseline RLS Policies

At minimum:

- `profiles` — owned by `auth.uid()`
- `courses` / `courseHoles` — viewable by all authenticated users, editable by admins
- Tournament data — accessible to tournament participants (refine later)
- `scoreEvents` — insertable by participants/markers/commissioners, viewable by tournament participants

These will be refined as roles solidify, but must exist from day one.

### 1.5 Seed Data

Flesh out `src/db/seed.ts` with:

- A sample course (18 holes with par, SI, yardage)
- A few persons (mix of registered users and guests)
- A tournament with 2 rounds
- Tournament participants, round participants with handicap snapshots
- A handful of score events

This becomes the test harness for everything that follows.

### Done when

- A user can sign up, log in, and see a protected home page
- All domain tables exist in Supabase with correct relationships
- RLS prevents unauthenticated access
- Seed data populates a realistic test scenario

---

## Phase 2 — Course Library

The simplest real feature. No tournament logic, no scoring. A good place to establish patterns for CRUD, data fetching, UI components, and form handling that the rest of the app will follow.

### 2.1 Install Core shadcn Components

Button, input, card, table, dialog, form, label, select, toast — enough to build real UI.

### 2.2 Course List Page

- Route at `/courses`
- Fetch courses with TanStack Query
- Display in a card grid or table
- Link to detail page

### 2.3 Course Detail Page

- Route at `/courses/$courseId`
- Display course info + holes table (hole number, par, SI, yardage)
- Admin-only edit button

### 2.4 Create Course Flow

- Form to create a course + add its 9 or 18 holes
- Drizzle insert → TanStack Query invalidation
- Establish the data mutation pattern used everywhere else

### Done when

- Users can browse, view, and (if admin) create courses
- The CRUD + query pattern is proven and reusable

---

## Phase 3 — Tournament Setup & Participant Management

The core "commissioner" workflow: create a tournament, add people, assign to rounds.

### 3.1 Tournament CRUD ✅

- List page at `/tournaments` with card grid, participant/round counts
- Create tournament form at `/tournaments/new`
- Detail page at `/tournaments/$tournamentId` — the tournament "hub" showing players & rounds
- Edit page at `/tournaments/$tournamentId/edit` with owner check
- Delete with confirmation dialog (owner only)
- Server functions: getTournamentsFn, getTournamentFn, createTournamentFn, updateTournamentFn, deleteTournamentFn
- RLS delete policy added for tournament creator

### 3.2 Person & Account Model ✅

**Revised approach:** Users don't "add people." They _are_ players by virtue of having an account. Guests are only created in tournament context.

- On signup, trigger auto-creates a `person` record linked to the profile
- Users manage their own player info (display name, handicap) via `/account`
- `persons` table is the universal player identity for tournaments & rounds
- Guests = persons with no `userId`, created during tournament setup (3.3)
- `createdByUserId` on persons tracks who created guest records
- RLS: users can update own person, creators can manage guest persons
- Existing users backfilled with person records via migration

### 3.3 Tournament Participants ✅

- "Join" button for current user to add themselves to a tournament
- "Add Player" dialog with search (by name) across all persons
- "Add Guest" tab to create a guest person inline and add to tournament
- Role management via dropdown (commissioner / player / marker / spectator)
- Handicap override dialog per participant
- Remove participant from tournament
- Server functions: searchPersonsFn, addParticipantFn, removeParticipantFn, updateParticipantFn, createGuestPersonFn, getMyPersonFn
- Validators: addParticipantSchema, updateParticipantSchema, createGuestSchema

### 3.4 Round Management

- Create rounds within a tournament, assign a course, set round number/date
- Round status workflow: `draft` → `open` → `locked` → `finalized`
- Create `RoundParticipant` records with handicap snapshots (auto-captured from `Person.currentHandicap`)
- Commissioner can set per-round handicap overrides

### 3.5 Team Setup

- Create `TournamentTeam` (persistent identity: "Team Europe")
- Create `RoundTeam` per round (may reference a `TournamentTeam` or be a one-off)
- Assign `RoundParticipant` members to `RoundTeam`

### 3.6 Tournament Roles

- Assign Commissioner / Marker / Player / Spectator to participants
- Enforce in UI (show/hide controls) and API (RLS / server validation)

### Done when

- A commissioner can create a tournament, add people, create rounds, assign participants to rounds, set up teams, and manage handicap overrides
- Roles gate what each user can see and do

---

## Phase 4 — Score Entry & Event Model

The core on-course experience. Mobile-first.

### 4.1 Score Entry UI

- Mobile-first scorecard for a round
- Enter strokes per hole for a participant
- Writes `ScoreEvent` with `recordedByUserId`, `recordedByRole`, `deviceId`
- Marker can enter scores for their assigned group
- Player can enter own score (if format allows)

### 4.2 Score Resolution

- Query function that resolves the latest `ScoreEvent` per `(roundId, roundParticipantId, holeNumber)` into a current scorecard
- Handles the "multiple events, latest wins" model

### 4.3 Effective Handicap Resolver

- Utility that walks the override cascade:
  `RoundParticipant.handicapOverride` → `TournamentParticipant.handicapOverride` → `RoundParticipant.handicapSnapshot`
- Returns the effective HC for each round participant
- Used by the scoring engine caller, not the engine itself

### 4.4 Commissioner Score Override

- Same score entry flow but with `recordedByRole: "commissioner"`
- UI shows audit trail — who entered, who changed, when, in what role

### Done when

- Scores can be entered on a mobile device
- The scorecard shows current scores (latest event wins)
- The full audit trail is visible
- Handicap overrides resolve correctly

---

## Phase 5 — Competition Engine & Leaderboards

Pure domain logic + the read-side projections.

### 5.1 Scoring Engine

- Implement `calculateCompetitionResults()` in `src/lib/domain/` as pure functions
- Start with **Stableford** (most common format for the use case)
- Add **Stroke Play** (gross and net)
- Add **Nearest the Pin**

### 5.2 Competition Config Types

- Define Zod discriminated union: `StablefordConfig`, `StrokePlayConfig`, `NearestPinConfig`, etc.
- Validate `configJson` at the application boundary (on create/update)

### 5.3 Competition CRUD

- Commissioner creates/edits competitions within a tournament
- Scoped to a round or tournament-wide
- Links to a `formatType` with typed config

### 5.4 Leaderboard Views

- Per-competition results page
- Pulls raw score events → resolves handicaps → runs engine → displays results
- All derived, nothing persisted
- Updates when new score events arrive

### 5.5 Additional Formats

- Match play, scramble, etc.
- Each is a new engine function + Zod union member
- No schema migration required

### Done when

- Stableford, stroke play, and nearest-the-pin competitions can be created and scored
- Leaderboards display live, derived results
- Adding a new format requires only TypeScript — no DB changes

---

## Phase 6 — Offline & Realtime

Polish for real-world on-course use.

### 6.1 TanStack Query Persister

- Wire up IndexedDB persistence so queries survive page reloads and offline periods

### 6.2 Offline Mutation Queue

- Score entry writes locally first, syncs when back online
- UI shows pending/synced state per score event

### 6.3 Supabase Realtime

- Subscribe to `score_events` inserts
- When another device enters a score, the leaderboard updates live
- Handle subscription lifecycle (connect, disconnect, reconnect)

### 6.4 Conflict Verification

- Test append-only + latest-timestamp-wins in practice
- Simulate offline/online transitions with multiple devices
- Verify no data loss or ordering issues

### Done when

- Scores can be entered with no signal and sync when connectivity returns
- Other users see live updates
- No data is lost during offline/online transitions

---

## Design Decisions

### Standalone Rounds (pre-Phase 3)

**Decision:** Make `rounds.tournamentId` nullable so rounds can exist outside tournaments.

**Rationale:** Users should be able to log casual rounds (e.g. weekend 18 with mates) without creating a tournament. A "My Rounds" view will show both tournament and standalone rounds in date order, with tournament rounds linking through to the tournament.

**Schema changes:**

- `rounds.tournamentId` — nullable (was `.notNull()`)
- `rounds.roundNumber` — nullable (meaningless for standalone rounds)
- `rounds.createdByUserId` — new FK to `profiles` (owner of standalone rounds)
- `roundParticipants.tournamentParticipantId` — nullable (standalone rounds skip tournament participants)
- `roundParticipants.personId` — new FK to `persons` (direct link, always set regardless of tournament/standalone)

---

## Open Questions (Parked)

| Question                                                 | Status                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deployment target** — Vercel, Netlify, Node, etc.      | Deferred. Spike after Phase 2 to avoid surprises. Need to understand backend story first.                                                    |
| **Testing strategy**                                     | Consider adding Vitest early. The pure scoring engine (Phase 5) is the most testable part — write engine tests as the first automated tests. |
| **Auth method** — email + password vs magic link vs both | Start with email + password. Revisit after Phase 1.                                                                                          |
| **PWA / native wrapper**                                 | Test iOS PWA behaviour early. Decide after Phase 4 when on-course UX is real.                                                                |

---

## Sequencing

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
 Auth &      Course      Tournament   Score       Engine &     Offline &
 Schema      Library     Setup        Entry       Leaderboards Realtime
```

Each phase produces something usable and builds on the last. Phase 1 is the clear starting point — auth and schema are blocking everything else.
