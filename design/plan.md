# Project Eagle – Build Plan

## Current State

Phases 1-5 are complete. Phase 6 is partially complete: offline-first scoring (6.1 + 6.2) is done, Supabase Realtime (6.3) and conflict verification testing (6.4) are not started.

The app has full auth, course library, tournament setup, score entry, round status guards, role-based permissions, a complete competition engine with UI, and offline-first score entry with persistence, optimistic updates, and automatic sync.

**Key design decisions confirmed:**

- Each round: up to 1 team comp + 1 individual comp + any bonuses
- Bonuses can be standalone or contribute to individual standings
- Foursomes (alternate shot) deferred — see `future-additions.md`
- Standalone rounds implemented via auto-tournament pattern (`isSingleRound` flag)

**What exists:**

- Full auth (email + password), protected routes, session handling
- Complete Drizzle schema: profiles, persons, courses, courseHoles, tournaments, tournamentParticipants, tournamentTeams, tournamentTeamMembers, rounds, roundGroups, roundParticipants, roundTeams, roundTeamMembers, scoreEvents, competitions, bonusAwards, tournamentStandings
- Rounds always belong to a tournament (`tournament_id` NOT NULL); standalone rounds use an auto-created tournament with `isSingleRound: true`
- Round groups: playing fourballs (1–4 players), auto-assign, manual assign
- Competitions have `groupScope` (`all` | `within_group`) and `participantType` (individual | team)
- RLS policies across all tables
- Course library (CRUD + list/detail pages)
- Tournament setup: CRUD, participants, teams, round management, status workflow
- Score entry: mobile scorecard, append-only events, audit trail, handicap resolver
- Round status guards (sequential transitions, delete/mutation guards)
- Role-based permissions: `requireCommissioner()` on all mutations, `isCommissioner` UI gating
- Competition engine: pure scoring functions for stableford, stroke play, match play, best ball
- Group-aware engine: `calculateGroupedResults()` splits by group for `within_group` competitions
- Competition CRUD server functions + bonus award mutations
- Group CRUD server functions (create, delete, assign, auto-assign, derive pairings)
- bonusAwards table for NTP/LD
- Competition management UI: create/delete competitions, format-specific config forms
- Leaderboard views: live, derived results for all scored formats
- Bonus award UI: NTP/LD dropdown on round page
- Tournament standings: aggregation engine (sum stableford, lowest strokes, match wins) + CRUD server functions
- `tournamentStandings` table with flexible aggregation config
- Offline-first scoring: IndexedDB query persistence (`idb-keyval`), `PersistQueryClientProvider`, mutation persistence via `setMutationDefaults` + `mutationKey`, optimistic updates with rollback, `resumePausedMutations` on hydration
- Offline UX: "Offline" badge, "Syncing..." badge, offline fallback page for non-round routes, `useOnlineStatus` hook, `localStorage` active round tracking
- Offline toast behavior: `toast.info` for offline saves, batched `toast.success` for sync (debounced 750ms), contextual `toast.error` with server error mapping for failures

**Key files:**

- `src/db/schema.ts` — full domain schema (~770 lines)
- `src/lib/domain/` — pure scoring engine (stableford, stroke-play, match-play, best-ball, bonus, standings)
- `src/lib/competitions.ts` — config Zod types + aggregation config + GROUP_SCOPE_LABELS
- `src/lib/competitions.server.ts` — CRUD server functions + tournament standings CRUD
- `src/lib/groups.server.ts` — group CRUD, auto-assign, pairing derivation
- `src/lib/auth.helpers.ts` — shared requireAuth + requireCommissioner
- `src/lib/validators.ts` — all app-level Zod schemas
- `src/lib/query-client.ts` — QueryClient factory, IndexedDB persister, mutation defaults, dehydrate options, batched sync toast
- `src/routes/__root.tsx` — `PersistQueryClientProvider` setup, `resumePausedMutations` on hydration
- `src/components/score-entry-dialog.tsx` — `useMutation` with optimistic updates, offline toast, error handling
- `src/components/offline-fallback.tsx` — offline landing page with active round redirect
- `src/hooks/use-online-status.ts` — online/offline status hook
- `src/routes/_app.tsx` — app layout with offline/syncing badges, offline fallback routing

---

## Phase 1 — Auth & Schema Foundation ✅

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

## Phase 2 — Course Library ✅

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

## Phase 3 — Tournament Setup & Participant Management ✅

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

### 3.4 Round Management ✅

- "Add Round" dialog on tournament hub: select course, set round number/date
- Auto-adds all tournament participants as round participants with handicap snapshots
- Round detail page at `/tournaments/$tournamentId/rounds/$roundId`
- Round status workflow with transition buttons: `draft` → `open` → `locked` → `finalized` (and back for corrections)
- Round participant list with per-round handicap override dialog
- Remove participant from round
- Delete round with confirmation
- Clickable round rows in tournament hub link to round detail
- Server functions: createRoundFn, getRoundFn, updateRoundFn, deleteRoundFn, transitionRoundFn, addRoundParticipantFn, removeRoundParticipantFn, updateRoundParticipantFn
- Validators: createRoundSchema, updateRoundSchema

### 3.5 Team Setup ✅

- Create `TournamentTeam` (persistent identity: "Team Europe")
- Create `RoundTeam` per round (may reference a `TournamentTeam` or be a one-off)
- Assign `RoundParticipant` members to `RoundTeam`
- Server functions: createTeamFn, updateTeamFn, deleteTeamFn, addTeamMemberFn, removeTeamMemberFn, setupRoundTeamsFn
- Auto-setup round teams from tournament teams

### 3.6 Tournament Roles ✅

- Assign Commissioner / Marker / Player / Spectator to participants
- Enforce in UI (show/hide controls) and API (server-side `requireCommissioner()` validation)
- `isCommissioner` check gates admin UI on tournament and round detail pages
- Self-join (Add Myself) allowed for any authenticated user as player

### Done when

- A commissioner can create a tournament, add people, create rounds, assign participants to rounds, set up teams, and manage handicap overrides
- Roles gate what each user can see and do

---

## Phase 4 — Score Entry & Event Model ✅

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

### 5.1 Scoring Engine ✅

- `calculateCompetitionResults()` dispatcher in `src/lib/domain/index.ts`
- **Stableford** (`src/lib/domain/stableford.ts`) — net points per hole, count-back tiebreaker (last 9/6/3/1), standard 0-5 point scale
- **Stroke Play** (`src/lib/domain/stroke-play.ts`) — gross and net, ranked ascending
- **Match Play** (`src/lib/domain/match-play.ts`) — 1v1 head-to-head using stableford points. Halved hole (0-0) stays halved, no stroke tiebreaker. Match declared at point of winning (e.g. "3&2") but scores continue for individual comps
- **Best Ball** (`src/lib/domain/best-ball.ts`) — 2v2 team, best stableford from each pair per hole, head-to-head
- **Bonus** (`src/lib/domain/bonus.ts`) — NTP/LD types and helpers (award-based, not score-derived)
- Shared types: `CompetitionInput`, `ParticipantData`, `HoleData`, `ResolvedScore`, `TeamData`

### 5.2 Competition Config Types ✅

- Zod discriminated union in `src/lib/competitions.ts` covering 6 formats:
  - `stableford` — countBack tiebreaker option
  - `stroke_play` — scoringBasis (gross or net)
  - `match_play` — pairings, variable pointsPerWin/pointsPerHalf
  - `best_ball` — team pairings, variable pointsPerWin/pointsPerHalf
  - `nearest_pin` — holeNumber
  - `longest_drive` — holeNumber
- `pointsPerWin` configurable per competition for increasing jeopardy (e.g. day 1 = 1pt, day 2 = 2pts, day 3 = 4pts)
- Helper functions: `isTeamFormat()`, `isMatchFormat()`, `isBonusFormat()`
- Format type labels for UI display

### 5.3 Competition CRUD ✅

- Server functions in `src/lib/competitions.server.ts`:
  - `getCompetitionsFn` — list by tournament
  - `getRoundCompetitionsFn` — round-scoped + tournament-wide
  - `getCompetitionFn` — single with bonus awards
  - `createCompetitionFn` — commissioner-gated, validates config via Zod union
  - `updateCompetitionFn` — commissioner-gated
  - `deleteCompetitionFn` — commissioner-gated
  - `awardBonusFn` — set NTP/LD winner (replaces any existing award)
  - `removeBonusAwardFn` — commissioner-gated
- Validators in `src/lib/validators.ts`: `createCompetitionSchema`, `updateCompetitionSchema`, `awardBonusSchema`
- `bonusAwards` table in schema for NTP/LD winner storage

### 5.4 Competition Management UI ✅

- `CompetitionsSection` on round detail page — full engine integration
- `AddCompetitionDialog` with format-specific config (count-back, scoring basis, match points, hole number)
- `BonusCompRow` for NTP/LD award management with participant dropdown
- Delete support for round-scoped competitions
- Commissioner-only controls

### 5.5 Leaderboard Views ✅

- `CompetitionResults` component — dispatcher to format-specific leaderboards
- `StablefordLeaderboard` — rank, player, HC, holes completed, total points
- `StrokePlayLeaderboard` — rank, player, HC, holes, gross/net, vs par
- `MatchPlayResults` / `BestBallResults` — matchup displays with result badges
- All derived from raw score events → engine → display (nothing persisted)
- Updates when router invalidates after score entry

### Done when

- All 6 formats can be created, configured, and scored
- Leaderboards display live, derived results
- Adding a new format requires only TypeScript — no DB changes

---

## Phase 6 — Offline & Realtime

Polish for real-world on-course use.

### 6.1 TanStack Query Persister ✅

- IndexedDB persistence via `idb-keyval` with throttled writes (1s) and 24h expiry
- `PersistQueryClientProvider` wrapping the app in `__root.tsx`
- Selective `dehydrateOptions`: only persist `round`, `tournament`, `competition`, `course` query keys
- `resumePausedMutations()` called on hydration success

### 6.2 Offline Mutation Queue ✅

- `setMutationDefaults` for `['submit-score']` with `mutationFn`, `onSuccess`, `onSettled`, `retry: 3`
- Split pattern: `mutationFn` + `onSuccess` + `onSettled` in defaults (survive reload), `onMutate` + `onError` in component (optimistic updates + rollback)
- `clientMeta.savedOffline` persists across reloads, used by `onSuccess` to trigger sync toast
- `mutationFn` strips `clientMeta` before sending to server
- Batched sync toast: debounced 750ms, "Score synced." / "Synced N scores."
- `networkMode: 'online'` (default) pauses mutations while offline
- Save button shows "Saving..." only when `isPending && !isPaused`
- Route-level data fetching refactored to `queryOptions` + `ensureQueryData`
- `localStorage` stores active round ID for offline fallback redirect
- Redundant `onSaved`/`router.invalidate()` removed from scoring path

### 6.2.1 Offline UX ✅

- `useOnlineStatus` hook
- "Offline" badge in app layout when disconnected
- "Syncing..." badge when `useIsMutating` for `['submit-score']` is non-zero
- `OfflineFallback` for non-round routes with "Return to Active Round" button
- Round routes render normally offline from persisted cache
- Contextual error toasts for failed mutations with server error mapping and offline/online prefixing

### 6.3 Supabase Realtime ✅

- `score_events` added to `supabase_realtime` publication
- `useScoreRealtime(roundId, userId)` hook subscribes to INSERT events filtered by `round_id`
- Skips own events to avoid double invalidation with optimistic update path
- Debounced query invalidation (500ms) batches rapid inserts
- Reconnect invalidates to catch missed events
- Channel cleanup on route unmount

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

### Competition Structure Per Round

**Decision:** Each round allows at most **1 team competition**, at most **1 individual competition**, and **any number of bonus competitions**. Validated at creation time.

**Rationale:** This matches how golf tournaments actually work — one day has one team format and one individual format running over the same scores. Bonuses (NTP/LD) are supplementary.

### Bonus Modes

**Decision:** Bonus competitions (NTP/LD) can be either **standalone** (just records a winner) or **contributor** (adds bonus points to the winner's individual tournament standing).

**Rationale:** Some tournaments use NTP/LD as tie-breakers or stableford additions. Others just want to recognise a winner. Both are valid.

### Standalone Rounds

**Decision:** Implemented via auto-tournament pattern. A "Quick Round" creates a hidden tournament with `isSingleRound: true`. The round detail page detects this flag and shows a simplified UI (no tournament breadcrumb, dashboard back link, inline player management).

**Rationale:** Keeps `rounds.tournamentId` NOT NULL, avoiding nullable FK complexity. The UI hides the tournament abstraction so the experience feels like a standalone round.

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
