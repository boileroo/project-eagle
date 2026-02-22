# Future Additions

Features and ideas that are out of scope for MVP but may be added later.

---

## Foursomes (Alternate Shot)

Two players share a ball and take alternate shots. Only one score per hole for the pair, not individual scores.

### Why deferred

Foursomes fundamentally changes the scoring input model. Currently every player has their own score per hole — foursomes produces one score per pair per hole. This requires:

- A new `RoundParticipant` pairing concept (two players → one scoring unit)
- Score entry UI that records a single score for a pair
- The scoring engine to accept pair-level scores alongside individual scores
- A decision about compatibility: foursomes is **not compatible with individual scoring** (you can't extract individual stableford from a shared ball)

### Possible approach

- Add a `foursomes` format type to competitions
- Pair participants at round level (similar to match play pairings but for scoring input, not just comparison)
- The pair becomes the scoring entity — score events reference the pair, not individual players
- Rounds with foursomes competitions cannot also have individual competitions (enforced at creation time)
- Team competitions (match play between pairs) would still work normally

### Impact

- Schema: minor (pairing linkage on round participants)
- Score entry UI: significant (new pair-based scorecard)
- Engine: moderate (new format engine, pair-aware dispatcher)
- Validation: moderate (enforce incompatibility with individual formats)

---

## Rumble ✅ Implemented

~~A team format where entire groups play against each other (previously called "Irish Rumble"). Group 1 (all Team A) vs Group 2 (all Team B), results auto-derived from aggregate stableford scores.~~

**Implemented** as the `rumble` competition format type. See `design.md` for full spec.

Key rules:

- Only available for 4-player groups where all players are on the same team
- Holes 1–6: best 1 stableford score from the group of 4
- Holes 7–12: sum of best 2 stableford scores
- Holes 13–17: sum of best 3 stableford scores
- Hole 18: sum of all 4 stableford scores
- Hole numbers = actual course hole numbers on the card
- All groups from the same team are summed → team total; higher team total wins
- `all` scope (no `between_groups` enum value needed — team pairings auto-derived from group membership)
- Config: `{ formatType: 'rumble', config: { pointsPerWin: number } }`

Key files:

- `src/lib/domain/rumble.ts` — scoring engine ✅
- `src/components/round-detail/add-team-comp-dialog.tsx` — add flow ✅
- `src/components/round-detail/edit-competition-dialog.tsx` — edit flow ✅

---

## Hi-Lo ✅ Implemented

A 2v2 within-group match format that runs two parallel matches per hole.

**Rules:**

- Requires exactly 2 players per team in each group (same as Best Ball)
- Per hole: **High ball** match (best stableford from each side) + **Low ball** match (worst stableford from each side)
- 2 points available per hole (1 for high ball, 1 for low ball)
- A side winning both = 2 pts; splitting = 1 pt each; both halved = 0 pts each
- `within_group` scope
- Config: `{ formatType: 'hi_lo', config: { pointsPerWin: number, pointsPerHalf: number } }`

Key files:

- `src/lib/domain/hi-lo.ts` — scoring engine ✅
- `src/components/round-detail/add-team-comp-dialog.tsx` — add flow ✅
- `src/components/round-detail/edit-competition-dialog.tsx` — edit flow ✅

---

## Wolf ✅ Designed, pending implementation

A within-group individual game played per-hole. Requires per-hole declarations that cannot be derived from scores — stored in the `gameDecisions` table.

**Rules:**

- Wolf order: fixed rotation from group participant order (Player 1 on holes 1, 5, 9, 13, 17; Player 2 on holes 2, 6, 10, 14, 18; etc.)
- On each hole, the wolf may pick a partner after seeing tee shots, or go lone wolf
- **Standard 2/4/2 points:**
  - Wolf + partner win: 2 pts each; others 0
  - Wolf + partner lose: others 2 pts each; wolf + partner 0
  - Lone wolf wins: wolf 4 pts; others 0
  - Lone wolf loses: each of the other 3 gets 2 pts; wolf 0
  - Ties: no points

**Declaration UI:** Appears in the live scoring view on the wolf's hole. The wolf selects a partner (or "Lone Wolf") before scores for the hole are submitted.

**Data model:**

```
GameDecision {
  id, competitionId, roundId, holeNumber,
  data: { wolfPlayerId, partnerPlayerId | null },
  recordedByUserId, createdAt
}
```

Latest record per `(competitionId, holeNumber)` wins (append-only, same pattern as ScoreEvents).

Key files (to be created):

- `src/lib/domain/wolf.ts` — scoring engine
- `src/components/live-scoring/wolf-declaration.tsx` — per-hole declaration UI
- Schema: `gameDecisions` table

---

## Six Point ✅ Implemented

A within-group individual game where points are distributed across finishing positions on each hole.

**Rules:**

- 4 players per group, 6 points distributed per hole across 4 positions
- Distribution is configurable by the commissioner (e.g. 3-2-1-0)
- Tie-splitting: tied players share the points for their tied positions (e.g. two players tied 1st share positions 1+2 → 2.5 pts each if distribution is 3-2-1-0)
- Fully score-derivable — no extra data needed beyond raw strokes
- `within_group` scope
- Config: `{ formatType: 'six_point', config: { distribution: [number, number, number, number] } }` — 4 values summing to 6

Key files (to be created):

- `src/lib/domain/six-point.ts` — scoring engine

---

## Chair ✅ Implemented

A within-group individual game based on holding a "chair" by winning holes outright.

**Rules:**

- Win a hole outright (best net stableford, no tie) → take the chair
- Tie → chair holder retains the chair (if no holder yet, no point is awarded for that hole)
- 1 point awarded per hole the chair is held at the end of the hole
- Fully score-derivable — no extra data needed
- `within_group` scope
- Config: `{ formatType: 'chair', config: {} }`

Key files (to be created):

- `src/lib/domain/chair.ts` — scoring engine

---

## Standalone Rounds ✅ Implemented

~~Allow rounds to exist outside tournaments for casual play (weekend 18 with mates).~~

**Implemented** via the "Quick Round" approach: `createSingleRoundFn` auto-creates a tournament with `isSingleRound: true` behind the scenes. The UI hides the tournament abstraction -- round detail page shows a simplified layout when `isSingleRound` is detected (no tournament breadcrumb, dashboard back link, inline player management). Schema unchanged: `rounds.tournamentId` remains NOT NULL.

Key files:

- `src/lib/rounds.server.ts` -- `createSingleRoundFn`
- `src/db/schema.ts` -- `isSingleRound` column on `tournaments`
- `src/components/pages/round-detail-page.tsx` -- conditional single-round UI
- `src/routes/_app/tournaments/$tournamentId/rounds/$roundId/index.tsx` -- conditional tournament/person data loading

---

## Private Tournaments & Join via Code

Tournaments are private by default. The dashboard only shows tournaments the user participates in (or created). Joining a tournament requires entering a join code or being added directly by a commissioner.

### Why deferred

The current model has no visibility/access control on tournaments — `getTournamentsFn` returns all tournaments for all users. This works fine for a single-user dev environment but won't scale to multiple users. The feature is straightforward but touches several layers (schema, queries, UI, invite flow).

### Proposed approach

**Schema changes:**

- Add `joinCode` column to `tournaments` (a short, human-friendly code like `EAGLE-7X3K`)
- Auto-generate on tournament creation

**Query changes:**

- `getTournamentsFn` (dashboard list) — filter to tournaments where the user is a participant OR the creator
- `getTournamentFn` (detail page) — allow access if participant, creator, or valid join code provided

**Join flow:**

- New "Join Tournament" UI (enter join code → preview tournament → confirm join)
- Commissioner can still add players directly (existing flow)
- Commissioner can regenerate/revoke the join code

**UI changes:**

- Tournament detail page: show join code to commissioners (with copy button)
- Dashboard: only shows "my tournaments"
- New join route (e.g., `/tournaments/join` or `/tournaments/join/:code`)

### Impact

- Schema: minor (1 new column on `tournaments`)
- Migration: simple (add column, backfill codes for existing tournaments)
- Queries: minor (`getTournamentsFn` adds a WHERE clause)
- UI: moderate (join flow, join code display, share button)
- Auth: no changes (existing participant/commissioner checks are sufficient)

### Key decisions

1. **Code format** — short alphanumeric (e.g., `EAGLE-7X3K`) vs UUID-based URL. Short codes are easier to share verbally on the golf course.
2. **Code expiry** — codes could optionally expire or be single-use. Simplest v1: codes are permanent until regenerated.
3. **Deep link** — `/tournaments/join/EAGLE-7X3K` could auto-fill the code from the URL, making it shareable as a link too.

---

## Friends System

A social layer that lets users connect with other golfers. Friends can be quickly added to tournaments by commissioners without needing a join code, making it easy to organise regular groups.

### Why deferred

The current system has no user-to-user relationships — participants are added by searching all persons or creating guests. A friends system introduces a new schema domain (friendships, requests), new UI surfaces (friend list, requests, search), and a friend-code sharing mechanism. It's a significant feature that benefits from the private tournaments work being done first.

### Sub-features

1. **Friend code** — each user has a unique, permanent code (e.g., `EAGLE-TOM1`) displayed on their profile. Share it verbally on the course, via text, or as a link (`/friends/add/EAGLE-TOM1`).
2. **Send friend request** — enter a friend code (or follow a link) to send a request. The sender sees a confirmation with the recipient's display name.
3. **Friend request notifications** — incoming requests surface as a badge/indicator in the app header or nav. A dedicated requests page lists pending incoming and outgoing requests.
4. **Accept / decline requests** — recipient can accept (creates the friendship) or decline (discards the request). Optionally: a declined request can be re-sent after a cooldown.
5. **Friends list** — view all current friends with display name, handicap, and online/last-seen indicators (if available). Search/filter within the list.
6. **Remove friend** — either party can remove the friendship at any time. Removing is silent (no notification to the other party).
7. **Commissioner quick-add from friends** — when adding participants to a tournament, the commissioner sees a "My Friends" tab alongside the existing person search. Selecting a friend adds them as a participant directly (no join code needed). This extends the existing `addParticipantFn` flow.
8. **Block user** (optional, v2) — prevent a specific user from sending friend requests. Blocked users cannot find you via friend code.

### Proposed schema

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
- Querying "my friends" means: `WHERE (userId = me OR friendUserId = me) AND status = 'accepted'`.

**`profiles` table changes:**

| Column       | Type                   | Notes                                                                     |
| ------------ | ---------------------- | ------------------------------------------------------------------------- |
| `friendCode` | text, unique, not null | Auto-generated on signup (e.g., `EAGLE-TOM1`). Displayed on profile page. |

### Query patterns

- **Get friends list**: `SELECT * FROM friendships WHERE (userId = $me OR friendUserId = $me) AND status = 'accepted'` — join to `profiles` and `persons` for display info.
- **Get pending requests (incoming)**: `WHERE friendUserId = $me AND status = 'pending'`
- **Get pending requests (outgoing)**: `WHERE userId = $me AND status = 'pending'`
- **Send request**: `INSERT INTO friendships (userId, friendUserId, status) VALUES ($me, $them, 'pending')` — reject if row already exists.
- **Accept request**: `UPDATE friendships SET status = 'accepted', respondedAt = now() WHERE id = $id AND friendUserId = $me`
- **Decline request**: `UPDATE friendships SET status = 'declined', respondedAt = now() WHERE id = $id AND friendUserId = $me`
- **Remove friend**: `DELETE FROM friendships WHERE id = $id AND (userId = $me OR friendUserId = $me)`
- **Lookup by friend code**: `SELECT * FROM profiles WHERE friendCode = $code` — used when entering a code to send a request.

### Server functions

| Function                   | Purpose                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `sendFriendRequestFn`      | Look up friend code -> validate target exists and isn't self -> insert `pending` friendship |
| `respondToFriendRequestFn` | Accept or decline an incoming request                                                       |
| `removeFriendFn`           | Delete an accepted friendship                                                               |
| `getFriendsFn`             | Return accepted friends for the current user (with person/profile info)                     |
| `getFriendRequestsFn`      | Return pending incoming and outgoing requests                                               |
| `getFriendCodeFn`          | Return the current user's friend code (for display/sharing)                                 |

### Routes

| Route                | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `/friends`           | Friends list + pending request count badge                                  |
| `/friends/requests`  | Incoming and outgoing friend requests with accept/decline actions           |
| `/friends/add`       | Enter a friend code to send a request                                       |
| `/friends/add/:code` | Deep link — auto-fills the code, shows target user preview, confirm to send |

### Integration with tournaments

The `addParticipantFn` in `tournaments.server.ts` currently lets commissioners search all persons by name. With the friends system:

- The "Add Participant" UI gains a **"Friends" tab** showing the commissioner's friends list (filtered to those not already in the tournament).
- Selecting a friend calls the existing `addParticipantFn` with their `personId` — no schema change needed, just a UI shortcut.
- The person search tab remains available for adding non-friends or guests.

### RLS considerations

- `friendships` rows should be visible only to the two users involved: `WHERE userId = auth.uid() OR friendUserId = auth.uid()`.
- Insert: any authenticated user can insert with `userId = auth.uid()` (cannot impersonate).
- Update: only `friendUserId = auth.uid()` can accept/decline.
- Delete: either party (`userId = auth.uid() OR friendUserId = auth.uid()`).

### Impact

- Schema: moderate (1 new table, 1 new column on `profiles`, new RLS policies)
- Migration: simple (new table, backfill friend codes for existing profiles)
- Server functions: moderate (6 new functions)
- Routes: moderate (4 new routes)
- UI: significant (friends list page, requests page, add-friend flow, friend-code display on profile, "Friends" tab in add-participant modal)
- Existing code changes: minor (add "Friends" tab to tournament participant add flow)

### Key decisions

1. **Friend code format** — same style as tournament join codes (`EAGLE-XXXX`) vs name-derived (`EAGLE-TOM1`). Name-derived codes are more memorable but require uniqueness handling.
2. **Re-requesting after decline** — allow immediately, after a cooldown period, or never (requires the other party to initiate). Recommended: allow re-request after the existing row is deleted (manual cleanup or auto-expire declined requests after 30 days).
3. **Friend code regeneration** — should users be able to change their friend code? Useful if they want to stop receiving requests. If yes, old codes should become invalid immediately.
4. **Notifications** — friend requests need visibility. Options: badge count in nav (polling or realtime), push notifications (requires native wrapper or web push), or email. Simplest v1: badge count via polling on the app layout loader.
5. **Mutual friends visibility** — should users see if they share mutual friends with someone? Nice-to-have but adds query complexity. Defer to v2.

---

## Native Wrapper (Capacitor etc.)

PWA and offline-first are **not deferred** — they are Phase 6 (IndexedDB persistence, offline mutation queue, Supabase Realtime). The open question is whether a **native wrapper** (Capacitor, etc.) is needed on top of the PWA if iOS imposes limitations on push notifications, background sync, or storage quotas. Test iOS PWA behaviour after Phase 6 and decide then.

---

## Magic Link Auth

Currently email + password. Could add magic link as an alternative sign-in method via Supabase Auth.

---

## Lifetime Player Stats

Aggregate a player's performance across all tournaments they've participated in. Requires the `Person` entity to be well-established and consistently used.

---

## Guest Account Claiming

A guest (Person without a userId) signs up and links their existing Person record to their new account, preserving all historical scores and participation.

## UI Polish & Copy Fixes ✅ Implemented

A collection of small but impactful UI, copy, and navigation improvements identified across the app. None require schema changes.

### Dashboard greeting

Replace the user's email with their display name in the dashboard greeting. The `profiles` table already stores a display name — use it. Fall back to email only if no display name is set.

### New round form labelling

- Mark required fields with an asterisk (`*`) and a legend at the bottom of the form
- Remove redundant labels that duplicate a field's placeholder or section heading

### Competition config copy fixes

- Bonus point label: "Contributor (adds to individual standings)" → **"Contributes to stableford point standings"**
- Match add button: `+ Match` → **`+ Team Match`**
- Competition type label: "Team Matchplay" → **"Singles"** (clearer: this is 1v1 within a team event, not a full matchplay format)
- Pairing hint text: "pairings can be configured" → **"pairings are configured in the Pairings tab"** (statement of fact, not a vague possibility)

### Points per half auto-calculation

When configuring a match, `pointsPerHalf` should default to exactly half of `pointsPerWin` and update automatically when `pointsPerWin` changes. The field remains editable for edge cases, but the default should always be derived.

### Course view navigation

- Add a back button/link on the course detail view to return to the courses list
- Fix missing hover styles on the delete course button (button exists but has no visual hover state — this is a bug)

### Players panel Teams toggle

The Teams toggle on the tournament Players panel is unclear. Redesign the label and surrounding UI so it is obvious what enabling Teams does (it enables team-based competitions for the tournament). Consider a more descriptive label such as "Enable Teams" with a one-line explanation beneath it.

---

## User Onboarding Flow

First-time users currently land on the dashboard with no guidance. Add a lightweight onboarding wizard shown once after signup.

### Screens

1. **Welcome** — brief introduction to the app
2. **Profile setup** — display name and handicap entry (pre-fill from signup data where available)
3. **Theme selection** — light / dark / system

### When to show

- Triggered when the user's profile has `onboardingCompletedAt = null`
- After completion, set `onboardingCompletedAt = now()` and redirect to the dashboard
- Skippable — the user can finish setup later from their profile settings page

### Schema

- Add `onboardingCompletedAt` (timestamptz, nullable) to `profiles`
- `null` = not completed; a timestamp = completed at that time

### Impact

- Schema: trivial (1 new nullable column on `profiles`)
- Migration: simple (add column; existing users can have it set to `now()` at migration time to skip onboarding)
- Server: trivial (`completeOnboardingFn` sets the timestamp)
- UI: moderate (3-step wizard component, new `/onboarding` route)
- Existing code: minor (app layout loader redirects to `/onboarding` when `onboardingCompletedAt` is null)

---

## Six Point Format Revision ✅ Implemented

The existing Six Point design (4-player, configurable distribution) is being replaced. The format is revised based on how it is actually played.

### Rule changes

- **Player count**: fixed at **3 players per group** (not 4)
- **Scoring basis**: commissioner chooses **stableford points** or **gross strokes** at competition creation time (lower gross = better when gross is selected)
- **Point distribution**: fixed at `4 / 2 / 0` (1st / 2nd / 3rd) — not configurable
- **Tie handling**:
  - Two players tied 1st, one clear 3rd: `3 / 3 / 0`
  - One clear 1st, two players tied 2nd: `4 / 1 / 1`
  - All three tied: `2 / 2 / 2`

### Config change

Old: `{ formatType: 'six_point', config: { distribution: [number, number, number, number] } }`

New: `{ formatType: 'six_point', config: { scoringBasis: 'stableford' | 'gross' } }`

### Impact

- Engine (`src/lib/domain/six-point.ts`): full rewrite — new tie-splitting logic, gross scoring path, 3-player assumption
- UI: competition config form replaces distribution inputs with a `scoringBasis` radio/toggle
- Validation: enforce group size = 3 at competition creation; surface a clear error if the round has 4-player groups
- Scope selector is removed from the UI (see Competition Configuration Validation below)

---

## Competition Configuration Validation ✅ Implemented

Several configuration options are currently exposed in the UI that either do not apply or should never be user-configurable. Fixing these reduces confusion and prevents invalid setups.

### Remove scope selector for within-group-only formats

Chair, Wolf, and Six Point are always `within_group`. The scope dropdown in the competition config form should be hidden entirely for these format types — scope is hardcoded in the engine and exposing it only creates invalid configuration paths.

### Teams enabled → games tab disabled

When a round has Teams enabled, the "Games" tab (within-group individual formats: Chair, Wolf, Six Point) should be hidden or disabled. Team events are structured around team matches and aggregate scoring; individual group games do not fit this model and produce results that cannot be meaningfully incorporated into team standings. Only the "Matches" tab should be available when teams are active.

### Singles match dropdowns filtered by team

When configuring a singles (1v1) match within a team event, the first player dropdown should be filtered to **Team A** members only, and the second to **Team B** members only. Currently both show all participants, making it easy to accidentally create a same-team match.

### One team match competition per round

A round should allow at most **one team match** competition. Attempting to add a second should surface an inline validation error. This prevents conflicting match results that have no clear aggregate.

---

## Round State: Awaiting Start Lock ✅ Implemented

Once a round transitions to `awaiting_start` status it should be fully locked — no configuration changes are possible until the round is either started or cancelled.

### What gets locked ✅

- Adding / removing players
- Adding / editing / removing competitions (matches, games, events)
- Editing round settings (date, course, format)

### UI treatment ✅

- All "Add" and "Edit" controls are hidden or visibly disabled when `status = 'awaiting_start'` ✅
- A banner explains the state: _"Round is locked — no configuration changes are possible until the round is started."_ ✅
- The round can still be **started** (→ `in_progress`) or **cancelled** from this state

### Round step navigation UX ✅

- **Button order**: Previous (go back) on the **left**, Next (advance) on the **right** ✅
- **Step indicator strip** with icons: ✅
  - Draft → pencil
  - Awaiting Start → clock
  - In Play → play circle
  - Completed → checkmark
- The active step is highlighted in the step indicator strip ✅

---

## Team Event Scorecard Enhancements

The scorecard and live scoring views for team rounds currently give no visual indication of who is matched against whom, and team colour is used inconsistently. Three related improvements address this.

### Matched pair grouping ✅

In the scorecard and live scoring view, visually group players into their match pairings — a bordered card or section per pairing makes it immediately clear which players are competing against each other without needing to navigate to a separate pairings view.

### Running match score ✅ Implemented

Display a live running score for each match inline on the scorecard — e.g. "A 3 – B 2" or "A/S" (all square) — updated hole by hole as scores are entered. This removes the need to leave the scorecard to check match standings during a round.

### Live scoring button ✅

- Move the button to the **top** of the scorecard view (currently buried below the card)
- Rename to something more direct — suggested: **"Quick Score"** or **"Score Holes"**

### Consistent team colour usage ✅

Apply team colours consistently across every view that surfaces team information:

- Players panel: team name and/or row border in team colour
- Scorecard: player name or row border tinted with team colour
- Match result summaries: team labels rendered in team colour
- Colours should be derived from the team record and applied via a shared utility (CSS variable or a small helper), not set per-component

### Impact

- Scorecard component: moderate (grouping, running score calculation, button repositioning)
- Shared colour utility: small (extract team colour lookup into one place)
- No schema changes required

---

## Bug: Player Add — Toast/State Mismatch ✅ Fixed

When adding a player to a round, the UI occasionally shows a "player already added" toast while the player does not appear in the participants list until a manual page refresh. This is a client-side state synchronisation issue — the server has recorded the participant but the relevant query cache has not been invalidated.

### Investigation

- Check the `addParticipantFn` call site and confirm the query invalidation / refetch fires on success
- Verify the toast condition: the "already added" message may be firing incorrectly before the optimistic update resolves
- Reproduce reliably and add a test case to prevent regression
