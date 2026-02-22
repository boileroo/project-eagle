# TODO

---

## A. Future Additions

Features and ideas that are out of scope for MVP but may be added later.

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

### Wolf UI

Wolf is designed and specified but the UI is not yet built. The engine spec and data model are captured in `DOMAIN.md`. The scoring engine is pending implementation.

#### Rules

- Wolf order: fixed rotation from group participant order (Player 1 on holes 1, 5, 9, 13, 17; Player 2 on holes 2, 6, 10, 14, 18; etc.)
- On each hole, the wolf may pick a partner after seeing tee shots, or go lone wolf
- **Standard 2/4/2 points:**
  - Wolf + partner win: 2 pts each; others 0
  - Wolf + partner lose: others 2 pts each; wolf + partner 0
  - Lone wolf wins: wolf 4 pts; others 0
  - Lone wolf loses: each of the other 3 gets 2 pts; wolf 0
  - Ties: no points

#### Declaration UI

Appears in the live scoring view on the wolf's hole. The wolf selects a partner (or "Lone Wolf") before scores for the hole are submitted.

#### Data model

```
GameDecision {
  id, competitionId, roundId, holeNumber,
  data: { wolfPlayerId, partnerPlayerId | null },
  recordedByUserId, createdAt
}
```

Latest record per `(competitionId, holeNumber)` wins (append-only, same pattern as ScoreEvents).

#### Files to create

- `src/lib/domain/wolf.ts` — scoring engine
- `src/components/live-scoring/wolf-declaration.tsx` — per-hole declaration UI
- Schema: `gameDecisions` table

---

### Private Tournaments & Invite Codes

Every tournament is private by default. The dashboard only shows tournaments the user participates in (or created). Joining requires an invite code.

#### Current state

`getTournamentsFn` returns ALL tournaments for ANY authenticated user — no isolation exists. There is no `isPrivate` flag, no invite code, no join mechanism.

#### Planned approach

**Schema:**

- Add `inviteCode text NOT NULL UNIQUE` to `tournaments`
- Generate via `crypto.randomBytes(4).toString('hex').toUpperCase()` (8-char uppercase hex, e.g. `A3F7D12E`) at creation time

**Query changes:**

- `getTournamentsFn` — filter to tournaments where user is creator OR participant
- `getTournamentFn` — restrict to participant, creator, or valid invite code

**Join flow:**

- New route: `src/routes/join.$code.tsx` — outside `_app` layout, works for both auth states
  - Unauthenticated: shows tournament name + login/signup buttons with `?redirect=/join/[code]`
  - Authenticated: shows join confirmation or redirects if already a member
- New `src/lib/join.server.ts`:
  - `getTournamentByInviteCodeFn` — no auth required, returns minimal data (name only)
  - `joinTournamentByCodeFn` — auth required; adds `tournamentParticipant` + `roundParticipants` for all draft/scheduled/open rounds
- New `regenerateInviteCodeFn` in `tournaments.server.ts` (commissioner only)
- New validators: `joinByCodeSchema`, `regenerateInviteCodeSchema`

**UI:**

- Invite link panel (commissioner-only) on tournament detail page — shows full URL, copy button, regenerate with confirmation dialog
- Dashboard: only shows "my tournaments"

**RLS:**

- New `supabase/migrate-invite-code.sql` — tighten `tournaments` SELECT to creator OR participant
- Drizzle migration required; existing tournament data can be wiped

#### Key decisions (resolved)

1. **Code format**: 8-char uppercase hex (e.g. `A3F7D12E`) — simple, no word-list collisions
2. **Code expiry**: permanent until regenerated (v1)
3. **Deep link**: `/join/[code]` auto-fills and processes the code from the URL

---

### Friends System

A social layer that lets users connect with other golfers. Friends can be quickly added to tournaments by commissioners without needing a join code, making it easy to organise regular groups.

#### Why deferred

The current system has no user-to-user relationships — participants are added by searching all persons or creating guests. A friends system introduces a new schema domain (friendships, requests), new UI surfaces (friend list, requests, search), and a friend-code sharing mechanism. It benefits from the private tournaments work being done first.

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

#### Query patterns

- **Get friends list**: `SELECT * FROM friendships WHERE (userId = $me OR friendUserId = $me) AND status = 'accepted'` — join to `profiles` and `persons` for display info.
- **Get pending requests (incoming)**: `WHERE friendUserId = $me AND status = 'pending'`
- **Get pending requests (outgoing)**: `WHERE userId = $me AND status = 'pending'`
- **Send request**: `INSERT INTO friendships (userId, friendUserId, status) VALUES ($me, $them, 'pending')` — reject if row already exists.
- **Accept request**: `UPDATE friendships SET status = 'accepted', respondedAt = now() WHERE id = $id AND friendUserId = $me`
- **Decline request**: `UPDATE friendships SET status = 'declined', respondedAt = now() WHERE id = $id AND friendUserId = $me`
- **Remove friend**: `DELETE FROM friendships WHERE id = $id AND (userId = $me OR friendUserId = $me)`
- **Lookup by friend code**: `SELECT * FROM profiles WHERE friendCode = $code` — used when entering a code to send a request.

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

#### Integration with tournaments

The `addParticipantFn` in `tournaments.server.ts` currently lets commissioners search all persons by name. With the friends system:

- The "Add Participant" UI gains a **"Friends" tab** showing the commissioner's friends list (filtered to those not already in the tournament).
- Selecting a friend calls the existing `addParticipantFn` with their `personId` — no schema change needed, just a UI shortcut.
- The person search tab remains available for adding non-friends or guests.

#### RLS considerations

- `friendships` rows visible only to the two users involved: `WHERE userId = auth.uid() OR friendUserId = auth.uid()`.
- Insert: any authenticated user can insert with `userId = auth.uid()` (cannot impersonate).
- Update: only `friendUserId = auth.uid()` can accept/decline.
- Delete: either party (`userId = auth.uid() OR friendUserId = auth.uid()`).

#### Impact

- Schema: moderate (1 new table, 1 new column on `profiles`, new RLS policies)
- Server functions: moderate (6 new functions)
- Routes: moderate (4 new routes)
- UI: significant (friends list, requests page, add-friend flow, friend-code on profile, "Friends" tab in add-participant modal)
- Existing code changes: minor (add "Friends" tab to tournament participant add flow)

#### Key decisions

1. **Friend code format** — same style as tournament join codes (`EAGLE-XXXX`) vs name-derived (`EAGLE-TOM1`). Name-derived codes are more memorable but require uniqueness handling.
2. **Re-requesting after decline** — allow immediately, after a cooldown period, or never. Recommended: allow re-request after the existing row is deleted (manual cleanup or auto-expire declined requests after 30 days).
3. **Friend code regeneration** — should users be able to change their friend code? If yes, old codes become invalid immediately.
4. **Notifications** — friend requests need visibility. Options: badge count in nav (polling or realtime), push notifications (requires native wrapper or web push), or email. Simplest v1: badge count via polling on the app layout loader.
5. **Mutual friends visibility** — nice-to-have but adds query complexity. Defer to v2.

---

### Native Wrapper (Capacitor etc.)

PWA and offline-first are not deferred — they are Phase 6 (IndexedDB persistence, offline mutation queue, Supabase Realtime). The open question is whether a native wrapper (Capacitor, etc.) is needed on top of the PWA if iOS imposes limitations on push notifications, background sync, or storage quotas. Test iOS PWA behaviour after Phase 6 and decide then.

---

### Magic Link Auth

Currently email + password only. Could add magic link as an alternative sign-in method via Supabase Auth.

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
- **Tournament privacy model**: Current read APIs are open to any authenticated user. Private tournaments / invite code work (see above) will resolve this — confirm if any read lockdown is needed before that work starts.
- **RLS vs app-layer auth**: Drizzle connects directly to Postgres, bypassing RLS entirely. Confirm if this is an intentional security model or if sensitive mutations should move through the Supabase client/RPC for defense-in-depth.
- **CSP `unsafe-inline`**: The Content-Security-Policy header uses `'unsafe-inline'` for scripts because TanStack Start injects inline scripts for SSR hydration. Revisit when TanStack Start exposes a nonce injection API. No immediate action required.
- **RLS tightening**: Most tables use `USING (true) WITH CHECK (true)` for authenticated users. Only worth tightening if a Supabase JS client data path is introduced (e.g. realtime subscriptions).
- **PWA iOS verification**: Phase 6.4 conflict verification still pending. Decide if a dedicated iOS PWA/offline sync test pass is needed before new game modes.
- **Locale for dates**: `en-AU`/`en-GB` is hardcoded in a few places. Decide if locale should be configurable or based on user profile.
- **Testing strategy**: Parked, but still a high-leverage safety net for the scoring engine.

---

## C. Recently Completed

### Rumble

A team format where entire groups play against each other. Holes 1–6: best 1 stableford; 7–12: sum of best 2; 13–17: sum of best 3; hole 18: sum of all 4. All groups from the same team are summed; higher total wins. Implemented as `rumble` competition format type.

Key files: `src/lib/domain/rumble.ts`, `src/components/round-detail/add-team-comp-dialog.tsx`, `src/components/round-detail/edit-competition-dialog.tsx`

### Hi-Lo

A 2v2 within-group match format with parallel high-ball and low-ball matches per hole. 2 points available per hole. Implemented as `hi_lo` format type.

Key files: `src/lib/domain/hi-lo.ts`, add/edit competition dialogs.

### Six Point (Format Revision)

Original 4-player configurable-distribution design replaced. Now: 3 players per group, fixed `4/2/0` distribution, commissioner chooses `stableford` or `gross` scoring basis, revised tie-splitting rules (`3/3/0`, `4/1/1`, `2/2/2`). Full engine rewrite.

### Chair

Within-group individual game. Win a hole outright (best net stableford, no tie) to take the chair; chair holder earns 1 point per hole held. Fully score-derivable. Implemented as `chair` format type.

### Standalone Rounds (Quick Round)

`createSingleRoundFn` auto-creates a tournament with `isSingleRound: true` behind the scenes. UI hides the tournament abstraction when `isSingleRound` is detected. Schema unchanged: `rounds.tournamentId` remains NOT NULL.

Key files: `src/lib/rounds.server.ts`, `src/db/schema.ts`, `src/components/pages/round-detail-page.tsx`.

### UI Polish & Copy Fixes

- Dashboard greeting uses display name (falls back to email)
- New round form: required field asterisks + legend
- Competition config copy fixes: bonus point label, match add button, competition type label, pairing hint text
- `pointsPerHalf` auto-defaults to half of `pointsPerWin`
- Course view: back button, delete button hover styles
- Players panel: Teams toggle redesigned with descriptive label and explanation

### Six Point Format Revision

See Six Point above — separate entry because it replaced the earlier design.

### Competition Configuration Validation

- Scope selector hidden for within-group-only formats (Chair, Wolf, Six Point)
- Games tab hidden/disabled when Teams is enabled on a round
- Singles match dropdowns filtered by team (Team A / Team B)
- One team match competition per round enforced with inline validation error

### Round State: Awaiting Start Lock

Once a round transitions to `awaiting_start`, all configuration is locked (players, competitions, round settings). UI hides all Add/Edit controls and shows a banner. Round step navigation: Previous left / Next right, step indicator strip with icons (Draft → pencil, Awaiting Start → clock, In Play → play circle, Completed → checkmark).

### Team Scorecard Enhancements

- Matched pair grouping: bordered card per pairing in scorecard and live scoring view
- Running match score inline on scorecard (e.g. "A 3 – B 2" or "A/S")
- Live scoring button moved to top, renamed to "Quick Score" / "Score Holes"
- Consistent team colours across players panel, scorecard, and match result summaries via shared utility

### Bug Fix: Player Add Toast/State Mismatch

When adding a player, the UI occasionally showed a "player already added" toast while the player didn't appear in the list until a manual refresh. Fixed: query cache invalidation now fires correctly on success.

### Security Hardening (Feb 2026)

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

- IDOR authorization checks added to all sensitive GET endpoints: `getTournamentFn`, `getCompetitionsFn`, `getTournamentStandingsFn`, `getScorecardFn`, `getScoreHistoryFn`, `getRoundFn`, `getRoundCompetitionsFn`, `getCompetitionFn`, `computeStandingsFn` — via `requireTournamentParticipant` and `verifyTournamentMembership` helpers in `auth.helpers.ts`
- `safeHandler` / `safeHandlerNoArg` HOFs added (`src/lib/server-utils.ts`) to catch and sanitise unexpected DB/Postgres errors on high-risk mutation handlers
- Rate limiting added to `computeStandingsFn` (30 req/user/min)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` added to `env.ts` validation; `supabase.server.ts` updated to use `env.*`
- Dual lockfile resolved: `yarn.lock` deleted; npm (`package-lock.json`) is the single package manager
