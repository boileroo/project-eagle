# Architecture Overview

## Vision & Guiding Principles

A social golf scoring app for **golf holidays with flexible tournament formats**.

- Multi-round tournaments with multiple simultaneous competitions
- Multiple scoring formats (matches, games, stableford, etc.)
- Individual and team competitions running over the same raw data
- Offline-first with live updates when connected
- Formats can change at any point — results are always re-derived
- Stores only raw facts; all results are projections

> This is not a CRUD golf app.
> This is an **event-driven golf competition engine** with UI on top.

### Guiding Principles

1. **Store facts, derive everything else**
2. **Offline-first from day one**
3. **Type safety over convenience**
4. **Keep schema flexible** — formats will evolve
5. **Avoid premature backend complexity**
6. **Keep hosting free initially**

---

## Current Build Status

Phases 1–6.3 are complete. Phase 6.4 (conflict verification testing) is not started. Phase 7 (Scoring Rework) is planned and design docs are complete — implementation not yet started.

The app has full auth, course library, tournament setup, score entry, round status guards, role-based permissions, a complete competition engine with UI, and offline-first score entry with persistence, optimistic updates, and automatic sync.

**Key design decisions confirmed:**

- Each round: up to 1 team comp + 1 individual comp + any bonuses
- Bonuses can be standalone or contribute to individual standings
- Foursomes (alternate shot) deferred — see `TODO.md`
- Standalone rounds implemented via auto-tournament pattern (`isSingleRound` flag)

---

## What Exists

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
- Offline toast behaviour: `toast.info` for offline saves, batched `toast.success` for sync (debounced 750ms), contextual `toast.error` with server error mapping for failures

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

## Phase History

### Phase 1 — Auth & Schema Foundation ✅

Everything depends on authenticated users and the core data model. Auth and schema are built together because RLS policies require both.

**1.1 Supabase Auth**

- Sign-up and login pages (email + password)
- Auth middleware on routes — redirect unauthenticated users
- Session handling in `__root.tsx` — load user on app init, pass via router context
- Protected route wrapper / layout route
- Zod schemas for login/signup in `src/lib/validators.ts`

**1.2 Full Drizzle Schema**

Replaced the placeholder `todos` table with all domain entities: `profiles`, `persons`, `courses`, `courseHoles`, `tournaments`, `rounds`, `tournamentParticipants`, `roundParticipants`, `tournamentTeams`, `roundTeams`, `roundTeamMembers`, `scoreEvents`, `competitions`. Generated Zod insert/select schemas and TypeScript types.

**1.3 First Migration**

- `yarn db:generate` + `yarn db:migrate` to push the schema to Supabase

**1.4 Baseline RLS Policies**

- `profiles` — owned by `auth.uid()`
- `courses` / `courseHoles` — viewable by all authenticated users, editable by admins
- Tournament data — accessible to tournament participants
- `scoreEvents` — insertable by participants/markers/commissioners, viewable by tournament participants

**1.5 Seed Data**

Fleshed out `src/db/seed.ts` with a sample course (18 holes with par, SI, yardage), a few persons (mix of registered users and guests), a tournament with 2 rounds, tournament participants, round participants with handicap snapshots, and a handful of score events.

---

### Phase 2 — Course Library ✅

**2.1** Installed core shadcn components: Button, input, card, table, dialog, form, label, select, toast.

**2.2** Course list page at `/courses` — TanStack Query fetch, card grid, link to detail.

**2.3** Course detail page at `/courses/$courseId` — course info + holes table (hole number, par, SI, yardage). Admin-only edit button.

**2.4** Create course flow — form to create a course + add its 9 or 18 holes. Established the Drizzle insert → TanStack Query invalidation pattern used everywhere else.

---

### Phase 3 — Tournament Setup & Participant Management ✅

**3.1 Tournament CRUD**

- List page at `/tournaments` with card grid, participant/round counts
- Create tournament form at `/tournaments/new`
- Detail page at `/tournaments/$tournamentId` — tournament "hub" showing players & rounds
- Edit page at `/tournaments/$tournamentId/edit` with owner check
- Delete with confirmation dialog (owner only)
- Server functions: `getTournamentsFn`, `getTournamentFn`, `createTournamentFn`, `updateTournamentFn`, `deleteTournamentFn`
- RLS delete policy added for tournament creator

**3.2 Person & Account Model**

Users don't "add people" — they _are_ players by virtue of having an account. Guests are only created in tournament context.

- On signup, trigger auto-creates a `person` record linked to the profile
- Users manage their own player info (display name, handicap) via `/account`
- `persons` table is the universal player identity for tournaments & rounds
- Guests = persons with no `userId`, created during tournament setup
- `createdByUserId` on persons tracks who created guest records
- RLS: users can update own person, creators can manage guest persons
- Existing users backfilled with person records via migration

**3.3 Tournament Participants**

- "Join" button for current user to add themselves to a tournament
- "Add Player" dialog with search (by name) across all persons
- "Add Guest" tab to create a guest person inline and add to tournament
- Role management via dropdown (commissioner / player / marker / spectator)
- Handicap override dialog per participant
- Remove participant from tournament
- Server functions: `searchPersonsFn`, `addParticipantFn`, `removeParticipantFn`, `updateParticipantFn`, `createGuestPersonFn`, `getMyPersonFn`
- Validators: `addParticipantSchema`, `updateParticipantSchema`, `createGuestSchema`

**3.4 Round Management**

- "Add Round" dialog on tournament hub: select course, set round number/date
- Auto-adds all tournament participants as round participants with handicap snapshots
- Round detail page at `/tournaments/$tournamentId/rounds/$roundId`
- Round status workflow with transition buttons: `draft` → `open` → `locked` → `finalized` (and back for corrections)
- Round participant list with per-round handicap override dialog
- Remove participant from round; delete round with confirmation
- Clickable round rows in tournament hub link to round detail
- Server functions: `createRoundFn`, `getRoundFn`, `updateRoundFn`, `deleteRoundFn`, `transitionRoundFn`, `addRoundParticipantFn`, `removeRoundParticipantFn`, `updateRoundParticipantFn`
- Validators: `createRoundSchema`, `updateRoundSchema`

**3.5 Team Setup**

- Create `TournamentTeam` (persistent identity: "Team Europe")
- Create `RoundTeam` per round (may reference a `TournamentTeam` or be a one-off)
- Assign `RoundParticipant` members to `RoundTeam`
- Server functions: `createTeamFn`, `updateTeamFn`, `deleteTeamFn`, `addTeamMemberFn`, `removeTeamMemberFn`, `setupRoundTeamsFn`
- Auto-setup round teams from tournament teams

**3.6 Tournament Roles**

- Assign Commissioner / Marker / Player / Spectator to participants
- Enforce in UI (show/hide controls) and API (server-side `requireCommissioner()` validation)
- `isCommissioner` check gates admin UI on tournament and round detail pages
- Self-join (Add Myself) allowed for any authenticated user as player

---

### Phase 4 — Score Entry & Event Model ✅

**4.1 Score Entry UI** — Mobile-first scorecard for a round. Writes `ScoreEvent` with `recordedByUserId`, `recordedByRole`, `deviceId`. Marker can enter scores for their assigned group; player can enter own score.

**4.2 Score Resolution** — Query function resolving the latest `ScoreEvent` per `(roundId, roundParticipantId, holeNumber)` into a current scorecard. Handles the "multiple events, latest wins" model.

**4.3 Effective Handicap Resolver** — Utility walking the override cascade:
`RoundParticipant.handicapOverride` → `TournamentParticipant.handicapOverride` → `RoundParticipant.handicapSnapshot`. Used by the scoring engine caller, not the engine itself.

**4.4 Commissioner Score Override** — Same score entry flow with `recordedByRole: "commissioner"`. UI shows audit trail — who entered, who changed, when, in what role.

---

### Phase 5 — Competition Engine & Leaderboards ✅

**5.1 Scoring Engine**

- `calculateCompetitionResults()` dispatcher in `src/lib/domain/index.ts`
- **Stableford** (`src/lib/domain/stableford.ts`) — net points per hole, count-back tiebreaker (last 9/6/3/1), standard 0-5 point scale
- **Stroke Play** (`src/lib/domain/stroke-play.ts`) — gross and net, ranked ascending
- **Match Play** (`src/lib/domain/match-play.ts`) — 1v1 head-to-head using stableford points. Halved hole (0-0) stays halved. Match declared at point of winning (e.g. "3&2") but scores continue for individual comps
- **Best Ball** (`src/lib/domain/best-ball.ts`) — 2v2 team, best stableford from each pair per hole, head-to-head
- **Bonus** (`src/lib/domain/bonus.ts`) — NTP/LD types and helpers (award-based, not score-derived)
- Shared types: `CompetitionInput`, `ParticipantData`, `HoleData`, `ResolvedScore`, `TeamData`

**5.2 Competition Config Types**

Zod discriminated union in `src/lib/competitions.ts` covering 6 formats: `stableford`, `stroke_play`, `match_play`, `best_ball`, `nearest_pin`, `longest_drive`. `pointsPerWin` configurable per competition for increasing jeopardy (e.g. day 1 = 1pt, day 2 = 2pts, day 3 = 4pts). Helper functions: `isTeamFormat()`, `isMatchFormat()`, `isBonusFormat()`.

**5.3 Competition CRUD**

Server functions in `src/lib/competitions.server.ts`: `getCompetitionsFn`, `getRoundCompetitionsFn`, `getCompetitionFn`, `createCompetitionFn` (commissioner-gated, validates config via Zod union), `updateCompetitionFn`, `deleteCompetitionFn`, `awardBonusFn` (set NTP/LD winner, replaces existing), `removeBonusAwardFn`. Validators: `createCompetitionSchema`, `updateCompetitionSchema`, `awardBonusSchema`. `bonusAwards` table in schema for NTP/LD winner storage.

**5.4 Competition Management UI**

`CompetitionsSection` on round detail page — full engine integration. `AddCompetitionDialog` with format-specific config (count-back, scoring basis, match points, hole number). `BonusCompRow` for NTP/LD award management with participant dropdown. Delete support for round-scoped competitions. Commissioner-only controls.

**5.5 Leaderboard Views**

`CompetitionResults` component — dispatcher to format-specific leaderboards. `StablefordLeaderboard` — rank, player, HC, holes completed, total points. `StrokePlayLeaderboard` — rank, player, HC, holes, gross/net, vs par. `MatchPlayResults` / `BestBallResults` — matchup displays with result badges. All derived from raw score events → engine → display (nothing persisted). Updates when router invalidates after score entry.

---

### Phase 6 — Offline & Realtime ✅ (6.1–6.3)

**6.1 TanStack Query Persister**

- IndexedDB persistence via `idb-keyval` with throttled writes (1s) and 24h expiry
- `PersistQueryClientProvider` wrapping the app in `__root.tsx`
- Selective `dehydrateOptions`: only persist `round`, `tournament`, `competition`, `course` query keys
- `resumePausedMutations()` called on hydration success

**6.2 Offline Mutation Queue**

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

**6.2.1 Offline UX**

- `useOnlineStatus` hook
- "Offline" badge in app layout when disconnected
- "Syncing..." badge when `useIsMutating` for `['submit-score']` is non-zero
- `OfflineFallback` for non-round routes with "Return to Active Round" button
- Round routes render normally offline from persisted cache
- Contextual error toasts for failed mutations with server error mapping and offline/online prefixing

**6.3 Supabase Realtime**

- `score_events` added to `supabase_realtime` publication
- `useScoreRealtime(roundId, userId)` hook subscribes to INSERT events filtered by `round_id`
- Skips own events to avoid double invalidation with optimistic update path
- Debounced query invalidation (500ms) batches rapid inserts
- Reconnect invalidates to catch missed events
- Channel cleanup on route unmount

**6.4 Conflict Verification — NOT STARTED**

- Test append-only + latest-timestamp-wins in practice
- Simulate offline/online transitions with multiple devices
- Verify no data loss or ordering issues

---

### Phase 7 — Scoring Rework ✅ Designed, NOT STARTED

A major rework of the competition and scoring model. Goal: simplify the commissioner experience, expose always-on individual scoring, and add new match/game formats.

**Context / Problems to Fix**

- Individual scoring requires the commissioner to manually create a `stableford` or `stroke_play` competition. If they forget, there is no individual leaderboard.
- The `tournamentStandings` aggregation config is complex and error-prone.
- The `roundTeams` / `roundTeamMembers` tables exist in schema but are never written to in practice.
- `participantType: 'individual' | 'team'` is confusing — conflates scoring subject with competition category.
- No support for games (Wolf, Six Point, Chair) or the Hi-Lo match format.

**Key Decisions**

- **Individual Scoreboard always present** — auto-computed from raw score events, not a competition. No configuration needed.
- **`stableford` and `stroke_play` competition types retired** from the UI (schema kept for legacy data display only).
- **`roundTeams` / `roundTeamMembers` dropped** — never written to.
- **`tournamentStandings` deprecated** — no new writes. Auto-computed leaderboards replace it entirely.
- **`participantType` renamed to `competitionCategory`** — values: `'match' | 'game' | 'bonus'`.
- **`primaryScoringBasis`** added to `rounds` and `tournaments` — commissioner marks the trophy column.
- **`gameDecisions` table added** — append-only per-hole game declarations (required for Wolf).

**7.1 Schema Migration**

- Drop `roundTeams` and `roundTeamMembers` tables
- Add `primaryScoringBasis` column to `rounds` (enum: `gross_strokes | net_strokes | stableford | total | null`)
- Add `primaryScoringBasis` column to `tournaments` (same enum)
- Add `gameDecisions` table (`id`, `competitionId`, `roundId`, `holeNumber`, `data` jsonb, `recordedByUserId`, `createdAt`)
- Rename `competitions.participantType` → `competitions.competitionCategory` with new enum values (`match | game | bonus`)
- Retire `stableford` and `stroke_play` from `formatTypeEnum` (keep values for legacy read; remove from UI options)

**7.2 Domain Engine**

- **New** `src/lib/domain/individual-scoreboard.ts` — computes gross/net/stableford/bonus/total per player
- **New** `src/lib/domain/rumble.ts` — escalating group aggregate; `all` scope
- **New** `src/lib/domain/hi-lo.ts` — dual high/low ball match per hole; `within_group` scope
- **New** `src/lib/domain/wolf.ts` — per-hole wolf declarations from `gameDecisions`; `within_group` scope
- **New** `src/lib/domain/six-point.ts` — configurable distribution with tie-splitting; `within_group` scope
- **New** `src/lib/domain/chair.ts` — state-machine chair tracking; `within_group` scope
- **Update** `src/lib/domain/best-ball.ts` — rename `TeamData.roundTeamId` → `teamId`
- **Update** `src/lib/domain/standings.ts` — remove aggregation config system; replace with auto-computation from round competition results
- **Update** `src/lib/domain/index.ts` — register new format engines; update `TeamData` interface

**7.3 Server Functions**

- `getIndividualScoreboardFn(roundId)` — returns per-player scoreboard rows (gross/net/stableford/bonus/total)
- `getTournamentLeaderboardFn(tournamentId)` — returns aggregated individual + team leaderboard
- `setRoundPrimaryScoringBasisFn(roundId, basis)` — commissioner sets trophy column
- `setTournamentPrimaryScoringBasisFn(tournamentId, basis)` — commissioner sets tournament trophy column
- `submitGameDecisionFn(competitionId, roundId, holeNumber, data)` — Wolf/game declarations
- `getGameDecisionsFn(competitionId)` — returns all decisions for a competition

**7.4 Round Detail UI**

- Reorder sections: Status controls → Scorecard → Individual Scoreboard → Team Competitions
- **New** `src/components/individual-scoreboard.tsx` — column headers (Gross/Net/Stableford/Bonus/Total), column visibility toggles (client preference), primary scoring basis badge
- Rename `CompetitionsSection` → `TeamCompetitionsSection` — restricted to match/game/bonus formats; smart pre-round availability matrix filters available formats based on group composition
- **New** Rumble config form in `add-team-comp-dialog.tsx`
- **New** Hi-Lo config form in `add-team-comp-dialog.tsx`
- Remove stableford/stroke_play from the "Add Competition" format selector

**7.5 Tournament Detail UI**

- Replace `standings-section.tsx` with two auto-computed leaderboard sections:
  - **Individual Leaderboard** — aggregates finalised rounds; same columns as Individual Scoreboard
  - **Team Leaderboard** — sums match points from all finalised rounds; only shown if teams exist
- **New** `src/components/tournament-detail/leaderboard-section.tsx`

**7.6 Wolf Declarations UI**

- Wolf declaration panel in live scoring view — appears on the wolf's hole; wolf selects partner or "Lone Wolf"
- `submitGameDecisionFn` mutation with optimistic update
- Wolf engine computes per-hole results and running totals

**Done when:** Every round automatically shows Gross/Net/Stableford columns — no competition setup required. Rumble, Hi-Lo, Wolf, Six Point, and Chair are all playable. Tournament leaderboards are auto-computed. `roundTeams` / `roundTeamMembers` tables are gone. All domain engine pure functions have Vitest unit tests.

---

## Tech Stack

| Layer             | Choice                                   |
| ----------------- | ---------------------------------------- |
| Package Manager   | npm                                      |
| Framework         | TanStack Start                           |
| Routing / Data    | TanStack Router + TanStack Query         |
| Database          | Supabase (Postgres)                      |
| ORM               | Drizzle                                  |
| Styling           | Tailwind CSS v4                          |
| UI Components     | shadcn/ui                                |
| Local Persistence | IndexedDB (via TanStack Query persister) |

**Drizzle** — Strong TypeScript types, SQL-like syntax (transparent, predictable), lightweight vs Prisma, works well with Supabase Postgres.

**Supabase** — Hosted Postgres, realtime subscriptions, built-in auth (foundational — required for RLS), free tier, pairs well with Drizzle.

**TanStack Query + IndexedDB** — Caching, background revalidation, offline mutation queue, ideal for unreliable mobile signal.

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

**Auth Model**

- Supabase manages `auth.users` (email, password hash, sessions)
- Our `profiles` table extends `auth.users` with app-specific data
- The `Person` entity links to `profiles` via `userId` (nullable for guests)

**Key Flows**

- **Sign up / Sign in** — email + password
- **Guest creation** — authenticated users create `Person` records without a `userId` for guests in their group
- **Guest claiming** — a guest can later sign up and link their `Person` to a new `userId`
- **Session management** — Supabase handles tokens, refresh, and expiry

**RLS Dependency**

Every table with user-scoped data uses Supabase RLS policies that reference `auth.uid()`. Without auth, there is no data access control. Note: Drizzle connects via a direct Postgres connection and bypasses RLS entirely — RLS is only effective for Supabase JS client paths (e.g. Realtime subscriptions). All current data mutations go through Drizzle server functions and are enforced at the application layer.

---

## Offline-First Strategy

**Client Flow**

1. User enters a score
2. Local store (IndexedDB via TanStack Query persister) writes the event immediately
3. UI updates optimistically
4. Background sync pushes event to Supabase
5. Supabase persists the event
6. Realtime subscription broadcasts to other connected clients

**Conflict Resolution**

- Append-only events — no destructive writes
- Latest `createdAt` timestamp per `(roundId, participantId, holeNumber)` wins
- No merge logic needed

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

### Open Questions (Parked)

| Question                                                 | Status                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deployment target** — Vercel, Netlify, Node, etc.      | Deferred. Spike after Phase 2 to avoid surprises. Need to understand backend story first.                                                    |
| **Testing strategy**                                     | Consider adding Vitest early. The pure scoring engine (Phase 5) is the most testable part — write engine tests as the first automated tests. |
| **Auth method** — email + password vs magic link vs both | Started with email + password. Revisit when needed.                                                                                          |
| **PWA / native wrapper**                                 | Test iOS PWA behaviour early. Decide after Phase 4 when on-course UX is real.                                                                |

---

## Completed Tech Debt

All items below were identified and resolved.

### Monolith Components

- Extracted `round-detail-page.tsx` (3,400 lines, ~13 inline sub-components) into `src/components/round-detail/` with individual files per component and a barrel re-export
- Extracted `tournament-detail-page.tsx` (1,960 lines, ~7 inline sub-components) into `src/components/tournament-detail/` with the same pattern
- Extracted shared `PersonSearchDialog` from the near-identical `AddParticipantDialog` in both pages (search + create guest tabs)

### Server Validation

- Replaced all passthrough `.inputValidator((data: T) => data)` calls with Zod `.parse()` — previously ~30+ server functions across 8 files did zero runtime validation
- Repurposed the 64 unused drizzle-zod schemas in `schema.ts` (lines 627–767) for this; used hand-written validators in `validators.ts`

### Database Indexes

- Added indexes on high-traffic FK columns: `scoreEvents(roundId)`, `scoreEvents(roundParticipantId)`, `roundParticipants(roundId)`, `rounds(tournamentId)`, `competitions(roundId)`, `tournamentParticipants(tournamentId)`, `bonusAwards(competitionId)`

### Duplicated Logic

- Extracted shared `resolveLatestScores()` helper — the "iterate events DESC, skip seen via Set" pattern was duplicated between `scores.server.ts` (getScorecardFn) and `competitions.server.ts` (computeStandingsFn)
- Reviewed the three `aggregate*` functions in `domain/standings.ts` — each has fundamentally different extraction logic (stableford points vs strokes vs match wins). Shared boilerplate is already extracted into `buildPersonLookup` and `expandByGroup` helpers. Forcing a generic `aggregateStandings()` would hurt readability without meaningful DRY benefit. No change made.

### Query Performance

- Fixed N+1 in `computeStandingsFn` — previously looped rounds sequentially with a separate `scoreEvents` query per round. Batched into a single `WHERE roundId IN (...)` query
- Moved `StandingsSection` computation from client-side `useEffect` into the route loader to eliminate the waterfall after initial render

### Dead Code

- Deleted `src/lib/collections.ts` — empty stub (`export {}`) left over from TanStack DB setup

### Smoke Test Issues

- Teams toggle was visible to non-commissioners — fixed
- User vs other players vs guests not clearly differentiated in players/teams panel — improved
- Pen/cog icons on scorecard removed
- App flickered into the offline placeholder screen when loading/refreshing — fixed

---

## Security Posture

### Completed (Feb 2026)

**First pass:**

- `requireAuth()` added to all 15 unprotected GET server functions
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (`__root.tsx`)
- Rate limiting on `signInFn` (10/15 min) and `signUpFn` (5/15 min)
- `signInFn` password validator corrected from `min(1)` to `min(8)`
- `.max()` limits added to all string fields in `validators.ts`
- ILIKE wildcard injection sanitised in `searchPersonsFn`
- `.env.example` corrected to `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` example updated with `?sslmode=require`
- `.gitignore` expanded: `.env.production`, `.env.staging`, `*.pem`, `*.key`, `*.cert`
- Runtime env var validation added (`src/lib/env.ts`), wired into `src/db/index.ts`
- npm audit — all critical/high findings are dev-only transitive deps, no production runtime exposure

**Second pass:**

- IDOR authorisation checks added to all sensitive GET endpoints: `getTournamentFn`, `getCompetitionsFn`, `getTournamentStandingsFn`, `getScorecardFn`, `getScoreHistoryFn`, `getRoundFn`, `getRoundCompetitionsFn`, `getCompetitionFn`, `computeStandingsFn` — via new `requireTournamentParticipant` and `verifyTournamentMembership` helpers in `auth.helpers.ts`
- `safeHandler` / `safeHandlerNoArg` HOFs added (`src/lib/server-utils.ts`) to catch and sanitise unexpected DB/Postgres errors on all high-risk mutation handlers (`createCourseFn`, `updateCourseFn`, `createTournamentFn`, `addParticipantFn`, `createRoundFn`, `addRoundParticipantFn`, `submitScoreFn`)
- Rate limiting added to `computeStandingsFn` (30 req/user/min)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` added to `env.ts` validation; `supabase.server.ts` updated to use `env.*` instead of `process.env.*!`
- Dual lockfile resolved: `yarn.lock` deleted; npm (`package-lock.json`) is the single package manager

### Remaining — Low Priority

**CSP `unsafe-inline` (acknowledged trade-off)**

The Content-Security-Policy header in `__root.tsx` uses `'unsafe-inline'` for scripts because TanStack Start injects inline scripts for SSR hydration. This weakens XSS protection — a nonce-based CSP would be strictly safer. Fix: revisit when TanStack Start exposes a nonce injection API. No immediate action required.

**RLS policies remain `USING (true)` (defence-in-depth)**

Supabase RLS policies on most tables use `USING (true) WITH CHECK (true)` for authenticated users. Because Drizzle uses a direct Postgres connection, RLS is bypassed entirely for all current data access — so this has no immediate impact. Fix: tighten RLS policies in `supabase/setup.sql` to scope access by tournament membership. This will become necessary when private tournaments (invite codes) are implemented, as Realtime channel security will depend on it.

---

## Build Sequencing

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6 ──→ Phase 7
 Auth &      Course      Tournament   Score       Engine &     Offline &   Scoring
 Schema      Library     Setup        Entry       Leaderboards Realtime    Rework
```
