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

## Standalone Rounds

Allow rounds to exist outside tournaments for casual play (weekend 18 with mates).

### Why deferred

The current model requires `rounds.tournamentId` NOT NULL. Standalone rounds were originally planned (see design.md "Design Decisions") but were deprioritised when tournaments became mandatory. The schema changes are known:

- `rounds.tournamentId` → nullable
- `rounds.createdByUserId` → new FK for standalone round ownership
- `roundParticipants.tournamentParticipantId` → nullable
- `roundParticipants.personId` → direct FK (always set)

### Possible approach

- A "Quick Round" flow that auto-creates a 1-round tournament behind the scenes, OR
- Restore nullable `tournamentId` and handle the two paths in the UI

---

## Private Tournaments & Invite System

Tournaments should be private by default. The tournaments dashboard should only show tournaments the user is a participant in (or created). Joining a tournament requires either an invite code or being added by a commissioner.

### Why deferred

The current model has no visibility/access control on tournaments — `getTournamentsFn` returns all tournaments for all users. This works fine for a single-user dev environment but won't scale to multiple users. The feature is straightforward but touches several layers (schema, queries, UI, invite flow).

### Proposed approach

**Schema changes:**

- Add `inviteCode` column to `tournaments` (a short, human-friendly code like `EAGLE-7X3K`)
- Auto-generate on tournament creation

**Query changes:**

- `getTournamentsFn` (dashboard list) — filter to tournaments where the user is a participant OR the creator
- `getTournamentFn` (detail page) — allow access if participant, creator, or valid invite code provided

**Join flow:**

- New "Join Tournament" UI (enter invite code → preview tournament → join)
- Commissioner can still add players directly (existing flow)
- Commissioner can regenerate/revoke the invite code

**UI changes:**

- Tournament detail page: show invite code to commissioners (with copy button)
- Dashboard: only shows "my tournaments"
- New join route (e.g., `/tournaments/join` or `/tournaments/join/:code`)

### Impact

- Schema: minor (1 new column on `tournaments`)
- Migration: simple (add column, backfill codes for existing tournaments)
- Queries: minor (`getTournamentsFn` adds a WHERE clause)
- UI: moderate (join flow, invite code display, share button)
- Auth: no changes (existing participant/commissioner checks are sufficient)

### Key decisions

1. **Code format** — short alphanumeric (e.g., `EAGLE-7X3K`) vs UUID-based URL. Short codes are easier to share verbally on the golf course.
2. **Code expiry** — codes could optionally expire or be single-use. Simplest v1: codes are permanent until regenerated.
3. **Deep link** — `/tournaments/join/EAGLE-7X3K` could auto-fill the code from the URL, making it shareable as a link too.

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
