# TODO

---

## A. Future Additions

Features and ideas that are out of scope for the current build but may be added later.

---

### Foursomes (Alternate Shot)

Two players share a ball and take alternate shots. Only one score per hole for the pair, not individual scores.

#### Why deferred

Foursomes fundamentally changes the scoring input model. Currently every player has their own score per hole — foursomes produces one score per pair per hole. This requires:

- A new `RoundParticipant` pairing concept (two players → one scoring unit)
- Score entry UI that records a single score for a pair
- The scoring engine to accept pair-level scores alongside individual scores
- A decision about compatibility: foursomes is **not compatible with individual scoring** (you can't extract individual stableford from a shared ball)

#### Possible approach

- Add a `foursomes` format type to competitions
- Pair participants at round level (similar to match play pairings but for scoring input, not just comparison)
- The pair becomes the scoring entity — score events reference the pair, not individual players
- Rounds with foursomes competitions cannot also have individual competitions (enforced at creation time)
- Team competitions (match play between pairs) would still work normally

#### Impact

- Schema: minor (pairing linkage on round participants)
- Score entry UI: significant (new pair-based scorecard)
- Engine: moderate (new format engine, pair-aware dispatcher)
- Validation: moderate (enforce incompatibility with individual formats)

---

### Friends System

A social layer that lets users connect with other golfers. Friends can be quickly added to tournaments by commissioners without needing a join code, making it easy to organise regular groups.

#### Why deferred

The current system has no user-to-user relationships — participants are added by searching all persons or creating guests. A friends system introduces a new schema domain (friendships, requests), new UI surfaces (friend list, requests, search), and a friend-code sharing mechanism.

#### Sub-features

1. **Friend code** — each user has a unique, permanent code (e.g., `EAGLE-TOM1`) displayed on their profile. Share it verbally on the course, via text, or as a link (`/friends/add/EAGLE-TOM1`).
2. **Send friend request** — enter a friend code (or follow a link) to send a request. The sender sees a confirmation with the recipient's display name.
3. **Friend request notifications** — incoming requests surface as a badge/indicator in the app header or nav. A dedicated requests page lists pending incoming and outgoing requests.
4. **Accept / decline requests** — recipient can accept (creates the friendship) or decline (discards the request). Optionally: a declined request can be re-sent after a cooldown.
5. **Friends list** — view all current friends with display name, handicap, and online/last-seen indicators (if available). Search/filter within the list.
6. **Remove friend** — either party can remove the friendship at any time. Removing is silent (no notification to the other party).
7. **Commissioner quick-add from friends** — when adding participants to a tournament, the commissioner sees a "My Friends" tab alongside the existing person search. Selecting a friend adds them as a participant directly (no join code needed). This extends the existing `addParticipantFn` flow.
8. **Block user** (optional, v2) — prevent a specific user from sending friend requests. Blocked users cannot find you via friend code.

#### Proposed schema

**`friendships` table:**

| Column         | Type                                    | Notes                                                            |
| -------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `id`           | uuid PK                                 |                                                                  |
| `userId`       | uuid, not null                          | FK -> `profiles.id`, cascade. The user who sent the request.     |
| `friendUserId` | uuid, not null                          | FK -> `profiles.id`, cascade. The user who received the request. |
| `status`       | enum(`pending`, `accepted`, `declined`) |                                                                  |
| `createdAt`    | timestamptz                             | When the request was sent                                        |
| `respondedAt`  | timestamptz, nullable                   | When accepted/declined                                           |

- **Unique constraint** on `(userId, friendUserId)` — only one active request/friendship between any two users.
- **Check constraint**: `userId != friendUserId` — cannot befriend yourself.
- A friendship is **symmetrical**: once `status = 'accepted'`, both users appear in each other's friends list. Only one row exists per pair (the direction records who initiated).
- Querying "my friends": `WHERE (userId = me OR friendUserId = me) AND status = 'accepted'`.

**`profiles` table changes:**

| Column       | Type                   | Notes                                                                     |
| ------------ | ---------------------- | ------------------------------------------------------------------------- |
| `friendCode` | text, unique, not null | Auto-generated on signup (e.g., `EAGLE-TOM1`). Displayed on profile page. |

#### Server functions

| Function                   | Purpose                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `sendFriendRequestFn`      | Look up friend code -> validate target exists and isn't self -> insert `pending` friendship |
| `respondToFriendRequestFn` | Accept or decline an incoming request                                                       |
| `removeFriendFn`           | Delete an accepted friendship                                                               |
| `getFriendsFn`             | Return accepted friends for the current user (with person/profile info)                     |
| `getFriendRequestsFn`      | Return pending incoming and outgoing requests                                               |
| `getFriendCodeFn`          | Return the current user's friend code (for display/sharing)                                 |

#### Routes

| Route                | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `/friends`           | Friends list + pending request count badge                                  |
| `/friends/requests`  | Incoming and outgoing friend requests with accept/decline actions           |
| `/friends/add`       | Enter a friend code to send a request                                       |
| `/friends/add/:code` | Deep link — auto-fills the code, shows target user preview, confirm to send |

#### Impact

- Schema: moderate (1 new table, 1 new column on `profiles`, new RLS policies)
- Server functions: moderate (6 new functions)
- Routes: moderate (4 new routes)
- UI: significant (friends list, requests page, add-friend flow, friend-code on profile, "Friends" tab in add-participant modal)
- Existing code changes: minor (add "Friends" tab to tournament participant add flow)

---

### Native Wrapper (Capacitor etc.)

PWA and offline-first are fully implemented — IndexedDB persistence, offline mutation queue, Supabase Realtime. The open question is whether a native wrapper (Capacitor, etc.) is needed on top of the PWA if iOS imposes limitations on push notifications, background sync, or storage quotas. Test iOS PWA behaviour and decide then.

---

### Magic Link Auth

Currently email + password and Google OAuth are implemented. Could add magic link as an alternative sign-in method via Supabase Auth.

---

### Lifetime Player Stats

Aggregate a player's performance across all tournaments they've participated in. Requires the `Person` entity to be well-established and consistently used.

---

### Guest Account Claiming

A guest (Person without a userId) signs up and links their existing Person record to their new account, preserving all historical scores and participation.

---

### User Onboarding Flow

First-time users currently land on the dashboard with no guidance. Add a lightweight onboarding wizard shown once after signup.

#### Screens

1. **Welcome** — brief introduction to the app
2. **Profile setup** — display name and handicap entry (pre-fill from signup data where available)
3. **Theme selection** — light / dark / system

#### When to show

- Triggered when the user's profile has `onboardingCompletedAt = null`
- After completion, set `onboardingCompletedAt = now()` and redirect to the dashboard
- Skippable — the user can finish setup later from their profile settings page

#### Schema

- Add `onboardingCompletedAt` (timestamptz, nullable) to `profiles`
- `null` = not completed; a timestamp = completed at that time

#### Impact

- Schema: trivial (1 new nullable column on `profiles`)
- Migration: simple (add column; existing users can have it set to `now()` at migration time to skip onboarding)
- Server: trivial (`completeOnboardingFn` sets the timestamp)
- UI: moderate (3-step wizard component, new `/onboarding` route)
- Existing code: minor (app layout loader redirects to `/onboarding` when `onboardingCompletedAt` is null)

---

## B. Pending Decisions & Open Questions

- **Plus-handicap policy**: `getPlayingHandicap()` currently clamps at 0 — plus handicaps don't give strokes. Keep as-is or support negative strokes?
- **RLS vs app-layer auth**: Drizzle connects directly to Postgres, bypassing RLS entirely. Confirm if this is an intentional security model or if sensitive mutations should move through the Supabase client/RPC for defense-in-depth.
- **CSP `unsafe-inline`**: The Content-Security-Policy header uses `'unsafe-inline'` for scripts because TanStack Start injects inline scripts for SSR hydration. Revisit when TanStack Start exposes a nonce injection API. No immediate action required.
- **RLS tightening**: Most tables use `USING (true) WITH CHECK (true)` for authenticated users. Only worth tightening if a Supabase JS client data path is introduced (e.g. realtime subscriptions). Private tournament implementation will require this.
- **PWA iOS verification**: Conflict verification (offline/online multi-device test) still pending. Decide if a dedicated iOS PWA/offline sync test pass is needed.
- **Locale for dates**: `en-AU`/`en-GB` is hardcoded in a few places. Decide if locale should be configurable or based on user profile.
- **Testing strategy**: Parked, but still a high-leverage safety net for the scoring engine.
- **6.4 Conflict Verification**: Simulate offline/online transitions with multiple devices to verify append-only + latest-timestamp-wins in practice.

---

## C. Recently Completed

### Wolf Engine & Declaration UI

Full Wolf implementation: scoring engine, per-hole declaration UI, and `gameDecisions` table.

- **Engine**: `src/lib/domain/wolf.ts` — within-group individual game, fixed rotation wolf order, standard 2/4/2 points (wolf+partner win: 2pts each; lone wolf wins: 4pts; lone wolf loses: 2pts to each of the other 3)
- **Declaration UI**: `src/components/pages/live-scoring-page/components/wolf-declaration-control.tsx` — per-hole wolf partner selection in the live scoring view
- **Server functions**: `submitGameDecisionFn`, `getGameDecisionsFn` in `src/lib/game-decisions.server.ts`
- **Schema**: `gameDecisions` table (`id`, `competitionId`, `roundId`, `holeNumber`, `data` jsonb, `recordedByUserId`, `createdAt`) — append-only, latest per `(competitionId, holeNumber)` wins

### Private Tournaments & Invite Codes

Every tournament is private by default. The dashboard only shows tournaments the user participates in (or created). Joining requires an invite code.

- **Schema**: `inviteCode text NOT NULL UNIQUE` on `tournaments` table. Golf-themed codes (e.g. `BIRDIE-X7K2`) generated by `generateInviteCode()` in `src/lib/server/invite-codes.server.ts`.
- **Query isolation**: `getTournamentsFn` filters to tournaments where user is creator or participant.
- **Join route**: `src/routes/join.$code.tsx` — outside `_app` layout. Unauthenticated users see tournament name + login/signup buttons with `?redirect=/join/[code]`. Authenticated users see join confirmation or redirect if already a member.
- **Server functions** in `src/lib/tournaments.server.ts`: `getTournamentByInviteCodeFn`, `joinTournamentByCodeFn`, `getTournamentInviteCodeFn`, `regenerateInviteCodeFn` (commissioner only)
- **Invite link panel** (commissioner-only) on tournament detail page — shows full URL, copy button, regenerate with confirmation dialog

### Scoring Rework (Phase 7)

Complete overhaul of the competition and scoring model.

- **Individual Scoreboard always present** — auto-computed from raw score events (no competition setup required). Columns: Gross / Net / Stableford / Bonus / Total.
- **`stableford` and `stroke_play` competition types retired** from UI (schema values kept for legacy data display).
- **`roundTeams` / `roundTeamMembers` dropped** — tables never written to in practice.
- **`tournamentStandings` deprecated** — no new writes. Auto-computed `getTournamentLeaderboardFn` replaces it.
- **`competitionCategory` enum** (`match | game | bonus`) on `competitions` table replaces old `participantType`.
- **`primaryScoringBasis`** added to `rounds` and `tournaments` — commissioner marks the trophy column (`gross_strokes | net_strokes | stableford | total`).
- **`gameDecisions` table** — append-only per-hole game declarations (required for Wolf).
- **New engines**: `rumble.ts`, `hi-lo.ts`, `wolf.ts`, `six-point.ts`, `chair.ts`, `individual-scoreboard.ts`, `tournament-leaderboard.ts`
- **New server functions**: `getIndividualScoreboardFn`, `getTournamentLeaderboardFn`, `setRoundPrimaryScoringBasisFn`, `setTournamentPrimaryScoringBasisFn` in `src/lib/scoreboards.server.ts`
- **Tournament detail**: `leaderboard-section.tsx` replaces `standings-section.tsx`. Two sections: Individual Leaderboard + Team Leaderboard (teams only).

### Rumble

A team format where entire groups play against each other. Holes 1–6: best 1 stableford; 7–12: sum of best 2; 13–17: sum of best 3; hole 18: sum of all 4. All groups from the same team are summed; higher total wins. Implemented as `rumble` competition format type.

Key files: `src/lib/domain/rumble.ts`, competition add/edit dialogs.

### Hi-Lo

A 2v2 within-group match format with parallel high-ball and low-ball matches per hole. 2 points available per hole. Implemented as `hi_lo` format type.

Key files: `src/lib/domain/hi-lo.ts`, competition add/edit dialogs.

### Six Point (Format Revision)

Original 4-player configurable-distribution design replaced. Now: 3 players per group, fixed `4/2/0` distribution, commissioner chooses `stableford` or `gross` scoring basis, revised tie-splitting rules (`3/3/0`, `4/1/1`, `2/2/2`). Full engine rewrite.

Key files: `src/lib/domain/six-point.ts`.

### Chair

Within-group individual game. Win a hole outright (best net stableford, no tie) to take the chair; chair holder earns 1 point per hole held. Fully score-derivable. Implemented as `chair` format type.

Key files: `src/lib/domain/chair.ts`.

### Standalone Rounds (Quick Round)

`createSingleRoundFn` auto-creates a tournament with `isSingleRound: true` behind the scenes. UI hides the tournament abstraction when `isSingleRound` is detected. Schema unchanged: `rounds.tournamentId` remains NOT NULL.

Key files: `src/lib/rounds.server.ts` (`createSingleRoundFn`), `src/db/schema.ts` (`isSingleRound` column on `tournaments`).

### UI Polish & Copy Fixes

- Dashboard greeting uses display name (falls back to email)
- New round form: required field asterisks + legend
- Competition config copy fixes: bonus point label, match add button, competition type label, pairing hint text
- `pointsPerHalf` auto-defaults to half of `pointsPerWin`
- Course view: back button, delete button hover styles
- Players panel: Teams toggle redesigned with descriptive label and explanation

### Competition Configuration Validation

- Scope selector hidden for within-group-only formats (Chair, Wolf, Six Point)
- Games tab hidden/disabled when Teams is enabled on a round
- Singles match dropdowns filtered by team (Team A / Team B)
- One team match competition per round enforced with inline validation error

### Round State: Awaiting Start Lock

Once a round transitions to `scheduled`, all configuration is locked (players, competitions, round settings). UI hides all Add/Edit controls and shows a banner. Round step navigation: Previous left / Next right, step indicator strip with icons (Draft → pencil, Awaiting Start → clock, In Play → play circle, Completed → checkmark).

### Team Scorecard Enhancements

- Matched pair grouping: bordered card per pairing in scorecard and live scoring view
- Running match score inline on scorecard (e.g. "A 3 – B 2" or "A/S")
- Live scoring button moved to top, renamed to "Quick Score" / "Score Holes"
- Consistent team colours across players panel, scorecard, and match result summaries via `src/lib/team-colours.ts`

### Bug Fix: Player Add Toast/State Mismatch

When adding a player, the UI occasionally showed a "player already added" toast while the player didn't appear in the list until a manual refresh. Fixed: query cache invalidation now fires correctly on success.

### Security Hardening (Feb 2026)

**First pass:**

- `requireAuth()` added to all unprotected GET server functions
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (`__root.tsx`)
- Rate limiting on `signInFn` (10/15 min) and `signUpFn` (5/15 min)
- `signInFn` password validator corrected from `min(1)` to `min(8)`
- `.max()` limits added to all string fields in validators
- ILIKE wildcard injection sanitised in `searchPersonsFn`
- `.env.example` corrected to `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` example updated with `?sslmode=require`
- `.gitignore` expanded: `.env.production`, `.env.staging`, `*.pem`, `*.key`, `*.cert`
- Runtime env var validation added (`src/lib/server/env.server.ts`), wired into `src/db/index.ts`
- npm audit — all critical/high findings are dev-only transitive deps, no production runtime exposure

**Second pass:**

- IDOR authorization checks added to all sensitive GET endpoints via `requireTournamentParticipant` and `verifyTournamentMembership` helpers in `src/lib/server/auth.helpers.server.ts`
- `safeHandler` / `safeHandlerNoArg` HOFs added (`src/lib/server/server-utils.server.ts`) to catch and sanitise unexpected DB/Postgres errors on high-risk mutation handlers
- Rate limiting added to `computeStandingsFn` (30 req/user/min)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` added to env validation; `supabase.server.ts` updated to use `env.*`
- Dual lockfile resolved: `yarn.lock` deleted; npm (`package-lock.json`) is the single package manager

### Google OAuth

`signInWithOAuthFn` added to `src/lib/auth.server.ts`. Google OAuth provider supported via Supabase Auth. Login/signup pages show Google sign-in button alongside email + password.

---

## D. User Thoughts and Findings
