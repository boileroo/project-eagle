# Architecture

A social golf scoring app for **golf holidays with flexible tournament formats**.

> This is not a CRUD golf app.
> This is an **event-driven golf competition engine** with UI on top.

---

## Guiding Principles

1. **Store facts, derive everything else** — only raw strokes, handicap snapshots, and game decisions are persisted; all results are computed at read time
2. **Offline-first from day one** — score entry works with no signal; events queue and sync automatically
3. **Type safety end to end** — DB schema → Drizzle types → Zod validators → server functions → client all share types
4. **Keep schema flexible** — `configJson` (jsonb) on competitions means new formats require no schema migration
5. **Event-based audit trail** — append-only score events mean the full history of every change is automatic

---

## Tech Stack

| Layer             | Choice                                                   |
| ----------------- | -------------------------------------------------------- |
| Package manager   | npm                                                      |
| Framework         | TanStack Start v1.114                                    |
| Routing / Data    | TanStack Router v1.114 + TanStack Query v5               |
| Database          | Supabase (Postgres)                                      |
| ORM               | Drizzle ORM v0.38                                        |
| Styling           | Tailwind CSS v4                                          |
| UI components     | shadcn/ui + Radix UI v1.4                                |
| Local persistence | IndexedDB via `idb-keyval` v6 + TanStack Query persister |
| Auth              | Supabase Auth (email+password + Google OAuth)            |
| Realtime          | Supabase Realtime (score_events publication)             |
| Forms             | react-hook-form v7 + Zod v4                              |
| Theming           | next-themes v0.4 (dark default, no system detection)     |
| PWA               | vite-plugin-pwa v1.2                                     |

---

## Repository Layout

```
src/
├── routes/                        # TanStack Router file-based routes
│   ├── __root.tsx                 # Root layout — PersistQueryClientProvider, ThemeProvider
│   ├── _app.tsx                   # Authenticated layout — offline/syncing badges
│   ├── _app/
│   │   ├── index.tsx              # Dashboard (/)
│   │   ├── account.tsx            # /account
│   │   ├── guests.tsx             # /guests
│   │   ├── courses/               # /courses, /courses/new, /courses/$courseId, /courses/$courseId/edit
│   │   ├── rounds/                # /rounds (redirect), /rounds/new, /rounds/$roundId (redirect)
│   │   └── tournaments/           # /tournaments, /tournaments/new
│   │       └── $tournamentId/     # /tournaments/$tournamentId, /…/edit
│   │           └── rounds/
│   │               └── $roundId/  # /…/$roundId, /…/$roundId/play
│   ├── _auth.tsx                  # Unauthenticated layout
│   ├── _auth/
│   │   ├── login.tsx              # /login
│   │   └── signup.tsx             # /signup
│   ├── auth/
│   │   └── callback.tsx           # /auth/callback (OAuth redirect handler)
│   ├── join.$code.tsx             # /join/$code (invite code join — no auth required)
│   └── offline.tsx                # /offline (offline fallback)
│
├── components/
│   ├── pages/                     # Page-level components (see Page Structure below)
│   ├── shared/                    # Shared reusable components
│   └── ui/                        # shadcn/ui primitives
│
├── lib/
│   ├── *.server.ts                # Server functions (createServerFn) — 13 domain files
│   ├── server/                    # Server-only utilities (never createServerFn)
│   ├── domain/                    # Pure scoring engine — 14 files
│   ├── validators/                # Zod schemas — 11 domain files + index.ts barrel
│   ├── query-options.ts           # All TanStack Query queryOptions factories
│   ├── query-client.ts            # QueryClient factory, IndexedDB persister, mutation defaults
│   ├── competitions.ts            # Competition config Zod schemas (discriminated union)
│   ├── handicaps.ts               # Effective handicap resolver + playing handicap
│   ├── scoring-utils.ts           # Shared score derivation utilities
│   ├── team-colours.ts            # Team accent colour mapping (coral / purple)
│   ├── tournament-status.ts       # Client-side tournament status helpers
│   └── mutation.ts                # Shared mutation helpers
│
├── db/
│   ├── schema.ts                  # Single-file Drizzle schema (~700 lines)
│   ├── index.ts                   # Drizzle client export
│   ├── migrations/                # Drizzle migration files
│   └── seed.ts                    # Dev seed data
│
├── hooks/                         # Custom React hooks (10 hooks + index.ts)
├── types/                         # Shared TypeScript types
├── config/                        # Static app config (constants, theme, PWA splash)
└── styles/
    └── globals.css                # Tailwind v4 @theme + all CSS custom properties
```

---

## Page Structure

Pages follow the folder pattern defined in `AGENTS.md`:

```
src/components/pages/
├── dashboard-page/
├── account-page/
├── courses-page/
├── course-detail-page/
├── tournaments-page/
├── tournament-detail-page/
│   └── components/
│       ├── leaderboard/           # leaderboard-section.tsx, leaderboard-table.tsx
│       ├── teams/                 # teams-tab.tsx, team-item.tsx, delete-team-dialog.tsx …
│       ├── groups/
│       ├── rounds/
│       ├── participants/
│       └── tournament-actions/
├── round-detail-page/
│   └── components/
│       ├── competitions/
│       ├── groups/
│       ├── participants/
│       ├── scorecard/
│       └── …
├── live-scoring-page/
│   └── components/
│       └── wolf-declaration-control.tsx
├── join-page/
└── guests-page/
```

---

## Server Functions

All server functions use `createServerFn` from TanStack Start. They live in `src/lib/*.server.ts` (domain files) and import from `src/lib/server/*.server.ts` (utility files). See `AGENTS.md` for the two-tier rule.

### Domain Files (13 total)

| File                       | Key functions                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tournaments.server.ts`    | `getTournamentsFn`, `getTournamentFn`, `createTournamentFn`, `updateTournamentFn`, `deleteTournamentFn`, `addParticipantFn`, `removeParticipantFn`, `updateParticipantFn`, `searchPersonsFn`, `createGuestPersonFn`, `getTournamentByInviteCodeFn`, `joinTournamentByCodeFn`, `getTournamentInviteCodeFn`, `regenerateInviteCodeFn`, + 6 more |
| `rounds.server.ts`         | `getRoundFn`, `createRoundFn`, `createSingleRoundFn`, `updateRoundFn`, `deleteRoundFn`, `transitionRoundFn`, `addRoundParticipantFn`, `removeRoundParticipantFn`, `updateRoundParticipantFn`, `reorderRoundsFn`, + 2 more                                                                                                                     |
| `scoreboards.server.ts`    | `getIndividualScoreboardFn`, `getTournamentLeaderboardFn`, `setRoundPrimaryScoringBasisFn`, `setTournamentPrimaryScoringBasisFn`                                                                                                                                                                                                              |
| `scores.server.ts`         | `submitScoreFn`, `getScorecardFn`, `getScoreHistoryFn`, `getPlayerScoresFn`                                                                                                                                                                                                                                                                   |
| `competitions.server.ts`   | `getCompetitionsFn`, `getRoundCompetitionsFn`, `getCompetitionFn`, `createCompetitionFn`, `updateCompetitionFn`, `deleteCompetitionFn`, `awardBonusFn`, `removeBonusAwardFn`                                                                                                                                                                  |
| `game-decisions.server.ts` | `submitGameDecisionFn`, `getGameDecisionsFn`                                                                                                                                                                                                                                                                                                  |
| `teams.server.ts`          | `createTeamFn`, `updateTeamFn`, `deleteTeamFn`, `addTeamMemberFn`, `removeTeamMemberFn`, `getTeamsFn`                                                                                                                                                                                                                                         |
| `groups.server.ts`         | `createGroupFn`, `deleteGroupFn`, `assignParticipantToGroupFn`, `removeParticipantFromGroupFn`, `autoAssignGroupsFn`, `deriveGroupPairingsFn`                                                                                                                                                                                                 |
| `courses.server.ts`        | `getCoursesFn`, `getCourseFn`, `createCourseFn`, `updateCourseFn`, `deleteCourseFn`                                                                                                                                                                                                                                                           |
| `standings.server.ts`      | `getTournamentStandingsFn`, `createTournamentStandingFn`, `updateTournamentStandingFn`, `deleteTournamentStandingFn`, `computeStandingsFn` (legacy)                                                                                                                                                                                           |
| `persons.server.ts`        | `getMyAccountFn`, `updateMyAccountFn`                                                                                                                                                                                                                                                                                                         |
| `auth.server.ts`           | `signInFn`, `signUpFn`, `signOutFn`, `getSessionFn`, `signInWithOAuthFn`                                                                                                                                                                                                                                                                      |
| `supabase.server.ts`       | `createSupabaseServerClient`                                                                                                                                                                                                                                                                                                                  |

### Server Utility Files (6 total — `src/lib/server/`)

| File                          | Exports                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `auth.helpers.server.ts`      | `requireAuth`, `requireCommissioner`, `requireCommissionerOrMarker`, `verifyTournamentMembership`, `requireTournamentParticipant` |
| `server-utils.server.ts`      | `safeHandler`, `safeHandlerNoArg`                                                                                                 |
| `rate-limit.server.ts`        | In-memory sliding-window rate limiter                                                                                             |
| `invite-codes.server.ts`      | `generateInviteCode()` — golf-themed codes (e.g. `BIRDIE-X7K2`)                                                                   |
| `tournament-status.server.ts` | `requireTournamentSetup()`                                                                                                        |
| `env.server.ts`               | Validates `DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` at startup                                         |

---

## Database Schema

Single file: `src/db/schema.ts`.

### Enums

| Enum                      | Values                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roundStatusEnum`         | `draft` \| `scheduled` \| `open` \| `finalized`                                                                                                                               |
| `tournamentStatusEnum`    | `setup` \| `scheduled` \| `underway` \| `complete`                                                                                                                            |
| `tournamentRoleEnum`      | `commissioner` \| `marker` \| `player`                                                                                                                                        |
| `primaryScoringBasisEnum` | `gross_strokes` \| `net_strokes` \| `stableford` \| `total`                                                                                                                   |
| `competitionCategoryEnum` | `match` \| `game` \| `bonus`                                                                                                                                                  |
| `formatTypeEnum`          | `match_play` \| `best_ball` \| `hi_lo` \| `rumble` \| `wolf` \| `six_point` \| `chair` \| `nearest_pin` \| `longest_drive` \| `stableford` (legacy) \| `stroke_play` (legacy) |
| `groupScopeEnum`          | `all` \| `within_group`                                                                                                                                                       |

### Tables

| Table                    | Purpose                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `profiles`               | Extends `auth.users` with display name, handicap                                                            |
| `persons`                | Human identity (guest or registered). `userId` nullable → guest                                             |
| `courses`                | Shared course library                                                                                       |
| `courseHoles`            | Hole-level par, SI, yardage                                                                                 |
| `tournaments`            | Top-level container. Has `inviteCode` (unique), `isSingleRound`, `status`, `primaryScoringBasis`            |
| `tournamentParticipants` | Person ↔ Tournament link. Has `role`, `handicapOverride`                                                    |
| `tournamentTeams`        | Persistent team identity for a tournament                                                                   |
| `tournamentTeamMembers`  | TournamentParticipant ↔ TournamentTeam                                                                      |
| `rounds`                 | A round of golf. Has `status`, `primaryScoringBasis`, `courseId`, `tournamentId` (NOT NULL)                 |
| `roundGroups`            | A playing group (fourball) within a round                                                                   |
| `roundParticipants`      | TournamentParticipant ↔ Round. Has `handicapSnapshot`, `handicapOverride`, `groupId`                        |
| `scoreEvents`            | Append-only score entries. Latest per `(roundId, roundParticipantId, holeNumber)` wins                      |
| `competitions`           | Round-scoped competition config. Has `competitionCategory`, `formatType`, `groupScope`, `configJson`        |
| `bonusAwards`            | NTP/LD winner. One per competition; overwritten on re-award                                                 |
| `gameDecisions`          | Append-only per-hole game declarations (Wolf partner choice). Latest per `(competitionId, holeNumber)` wins |
| `tournamentStandings`    | **DEPRECATED — legacy read only. No new writes.**                                                           |

> `roundTeams` and `roundTeamMembers` tables were dropped (never written to in practice). Teams are tournament-level only.

---

## Domain Engine

All scoring logic lives in `src/lib/domain/`. **Pure TypeScript. No DB access. No framework coupling.**

### Files (14)

| File                        | Purpose                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| `index.ts`                  | `calculateCompetitionResults()` dispatcher                        |
| `individual-scoreboard.ts`  | Gross / Net / Stableford / Bonus / Total per player               |
| `tournament-leaderboard.ts` | Aggregated individual + team leaderboard across finalised rounds  |
| `stableford.ts`             | Net stableford per hole, count-back tiebreaker                    |
| `stroke-play.ts`            | Gross and net, ranked ascending                                   |
| `match-play.ts`             | 1v1 using stableford points per hole                              |
| `best-ball.ts`              | 2v2 team, best stableford per pair per hole                       |
| `hi-lo.ts`                  | 2v2 team, dual high/low ball matches per hole                     |
| `rumble.ts`                 | Group-vs-group, escalating scores count per hole range            |
| `wolf.ts`                   | Within-group individual, per-hole wolf declarations, 2/4/2 points |
| `six-point.ts`              | 3-player, fixed 4/2/0, stableford or gross basis, tie-splitting   |
| `chair.ts`                  | State-machine: win outright to take chair, 1pt/hole held          |
| `bonus.ts`                  | NTP/LD award helpers                                              |
| `standings.ts`              | Legacy aggregation (reads `tournamentStandings`; no new writes)   |
| `rank.ts`                   | Shared rank assignment with tie handling                          |

### Dispatcher Signature

```ts
calculateCompetitionResults({
  competition,      // { id, name, config: CompetitionConfig }
  holes,            // HoleData[] (holeNumber, par, strokeIndex)
  participants,     // ParticipantData[] (pre-resolved effective handicaps)
  scores,           // ResolvedScore[] (latest event per participant+hole)
  teams?,           // TeamData[] (for match formats)
  gameDecisions?,   // GameDecision[] (for Wolf)
}): CompetitionResult
```

---

## Hooks

All hooks live in `src/hooks/` and are re-exported from `src/hooks/index.ts`.

| Hook                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `useAuth`             | Current session + user from router context                |
| `useRoundPermissions` | `isCommissioner`, `isMarker`, `canEditScores` for a round |
| `useScoreMutation`    | Submit score with optimistic update + offline queue       |
| `useScoreRealtime`    | Supabase Realtime subscription for score_events           |
| `useScoringResume`    | localStorage active round tracking for offline fallback   |
| `useActiveRound`      | Read/write active round ID in localStorage                |
| `useOnlineStatus`     | Online/offline browser status                             |
| `useOfflineFallback`  | Offline fallback routing logic                            |
| `useClipboard`        | Copy to clipboard with success state                      |
| `useConfirmDialog`    | Dialog open/confirm/cancel state management               |

---

## Validators

Split across `src/lib/validators/` (11 domain files) with a barrel re-export at `src/lib/validators.ts`.

```
src/lib/validators/
├── index.ts        # Re-export all
├── auth.ts
├── course.ts
├── tournament.ts
├── round.ts
├── score.ts
├── competition.ts
├── participant.ts
├── account.ts
├── team.ts
└── shared.ts       # handicapField, dateField, etc.
```

---

## Query Options

All `queryOptions` factories are centralised in `src/lib/query-options.ts`. Routes and components import from here — never define their own.

---

## Offline-First Strategy

**Client Flow**

1. User enters a score
2. Optimistic update applied immediately to the UI
3. Mutation persisted to IndexedDB mutation queue
4. If online: mutation fires immediately, server confirms, query cache invalidated
5. If offline: mutation pauses in queue; "Offline" badge shown
6. On reconnect: `resumePausedMutations()` replays queue; batched "Synced N scores." toast (debounced 750ms)
7. Supabase Realtime broadcasts new `score_events` to other connected clients; `useScoreRealtime` invalidates queries (debounced 500ms, skips own events)

**Persistence**

- `PersistQueryClientProvider` in `__root.tsx` — IndexedDB via `idb-keyval`, 24h expiry, throttled writes (1s)
- Selective dehydration: only `round`, `tournament`, `competition`, `course` query keys persisted
- Mutation defaults via `setMutationDefaults(['submit-score'])` — `mutationFn`, `onSuccess`, `onSettled`, `retry: 3` — survive page reload

**Conflict Resolution**

- Append-only events — no destructive writes
- Latest `createdAt` per `(roundId, roundParticipantId, holeNumber)` wins at query-time

---

## Authentication

Handled by **Supabase Auth**.

- **Methods**: Email + password, Google OAuth
- **Schema**: `auth.users` managed by Supabase; `profiles` table extends it with display name and handicap
- **Person entity**: `Person.userId` nullable — null = guest (no account)
- **Session flow**: `getSessionFn` on app init, passed via TanStack Router context
- **Route protection**: `_app.tsx` layout route redirects unauthenticated users to `/login`
- **RLS note**: Drizzle uses a direct Postgres connection — RLS is bypassed for all data mutations. Auth is enforced at the application layer via `requireAuth()` / `requireCommissioner()`. RLS policies (`USING (true)`) only protect Supabase JS client paths (Realtime subscriptions).

---

## Roles & Permissions

### Tournament-Scoped (3 roles — no Spectator)

| Role         | Capabilities                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Commissioner | Configure tournament, manage participants & teams, lock rounds, override scores, manage competitions, manage invite code |
| Marker       | Enter/edit scores for their group, award bonus competitions, record Wolf declarations                                    |
| Player       | Enter/edit own score, self-join tournaments via invite code                                                              |

Permissions enforced at both layers:

- **Client-side**: UI gating via `useRoundPermissions` hook (`isCommissioner`, `isMarker`, `canEditScores`)
- **Server-side**: `requireCommissioner()` / `requireCommissionerOrMarker()` in `src/lib/server/auth.helpers.server.ts` on all mutations. IDOR checks via `verifyTournamentMembership` / `requireTournamentParticipant` on all sensitive GET endpoints.

---

## Security Posture

### Implemented (Feb 2026)

- `requireAuth()` on all GET server functions
- Security headers in `__root.tsx`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Rate limiting: `signInFn` (10/15 min), `signUpFn` (5/15 min), `computeStandingsFn` (30/min)
- IDOR authorisation on all sensitive GET endpoints
- `safeHandler` / `safeHandlerNoArg` wrapping all high-risk mutations
- ILIKE wildcard injection sanitised in `searchPersonsFn`
- Runtime env var validation at startup (`src/lib/server/env.server.ts`)
- `.max()` limits on all string validator fields

### Remaining — Low Priority

**CSP `unsafe-inline`** — TanStack Start injects inline scripts for SSR hydration. Revisit when TanStack Start exposes a nonce injection API.

**RLS policies remain `USING (true)`** — No immediate impact since Drizzle bypasses RLS. Will need tightening when Realtime channel security matters (private tournaments + Realtime together).

---

## Design Decisions

### Individual Scoreboard Always Present

Every round automatically shows Gross / Net / Stableford columns — no competition setup required. The `stableford` and `stroke_play` competition types are retired from the UI (schema values preserved for legacy data display).

### Competition Structure Per Round

At most **1 match** + **1 game** + **unlimited bonuses** per round. Validated at creation time. Matches require teams; games and bonuses do not.

### Bonus Modes

NTP/LD competitions can be **standalone** (records a winner only) or **contributor** (adds bonus points to the Individual Scoreboard Total column). One winner per competition — awarding a new winner replaces the previous.

### Standalone Rounds

"Quick Round" creates a hidden tournament with `isSingleRound: true`. The round detail page detects this flag and shows simplified UI (no tournament breadcrumb, inline player management). Keeps `rounds.tournamentId` NOT NULL.

### Invite-Only Tournaments

`getTournamentsFn` filters to tournaments where the authenticated user is creator or participant. Joining requires an invite code. Codes are golf-themed (e.g. `BIRDIE-X7K2`), permanent until regenerated by the commissioner.

### Append-Only Events

Both `scoreEvents` and `gameDecisions` are append-only. The latest record per key wins at query time. This gives automatic audit trail, offline safety, and sync-safe merging with no destructive conflicts.

---

## Risks & Constraints

| Risk                         | Mitigation                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| iOS PWA limitations          | Test early; may need native wrapper later. Offline sync verification pending.                        |
| IndexedDB storage quotas     | Score events are small; monitor usage                                                                |
| Sync conflicts (poor signal) | Append-only model avoids destructive conflicts                                                       |
| Complex scoring rules        | Pure-function engine is easy to extend and test                                                      |
| Format flexibility           | `configJson` (jsonb) on competitions allows arbitrary config — no migration for new formats          |
| RLS bypass via Drizzle       | Acceptable for current app-layer auth model; revisit if Supabase JS client data paths are introduced |
