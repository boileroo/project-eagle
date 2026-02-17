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

## Irish Rumble (Group vs Group)

A team format where entire groups play against each other. Group 1 (all Team A) vs Group 2 (all Team B), with the commissioner deciding the winning team and awarding points.

### Why deferred

Irish Rumble requires a new competition format engine and potentially a `between_groups` group scope. The current system has `all` and `within_group` scopes, but Irish Rumble is inter-group — two groups compete against each other as units.

### Possible approach

**Option A — `between_groups` scope:**

- Add a `between_groups` value to `groupScopeEnum`
- New `irish_rumble` format type with its own config (e.g. which groups are paired, points per win)
- Engine compares aggregate scores across paired groups

**Option B — `all`-scope team competition:**

- Irish Rumble maps naturally to a team competition with `all` scope where the commissioner simply awards the result
- No new scope needed — the existing team match play model can represent it if groups happen to align with teams
- May need a "commissioner-decided" match result mode (winner picked manually, not derived from scores)

**Option B is simpler** and may be sufficient if the commissioner is already deciding the winner. The key question is whether results should be auto-derived from aggregate scores or manually awarded.

### Impact

- Schema: minor (new enum value if Option A)
- Engine: moderate (new format engine for aggregate group-vs-group scoring)
- UI: minor (group pairing selection in competition config)

---

## `between_groups` Group Scope

A third scope option where competitions run between groups rather than within them. Currently only needed for Irish Rumble (see above). Could also support other inter-group formats in future.

If Irish Rumble is handled via Option B (all-scope team competition), this may not be needed at all.

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
