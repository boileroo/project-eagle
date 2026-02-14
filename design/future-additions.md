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
