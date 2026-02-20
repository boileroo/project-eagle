# Outstanding Questions + Follow-ups

Use this list to capture decisions and next steps that require user input.

## Decisions Needed

- **Plus-handicap policy**: Currently `getPlayingHandicap()` clamps at 0, so plus handicaps don't give strokes. Keep as-is or support negative strokes?
- **Tournament privacy model**: Current read APIs are open to any authenticated user. Confirm if we should lock reads down to participants/creators now or only when adding join codes.
- **RLS vs app-layer auth**: Drizzle connects directly to Postgres, so RLS is effectively bypassed. Confirm if this is an intentional security model or if you want to move sensitive mutations through the Supabase client/RPC for defense-in-depth.
- **PWA iOS verification**: Phase 6.4 conflict verification is still pending. Decide if you want a dedicated iOS PWA/offline sync test pass before new game modes.

## Follow-ups to Consider

- **Join codes**: From `design/future-additions.md` — confirm code format (short code vs UUID), expiry, and deep link strategy.
- **Locale for dates**: `en-AU`/`en-GB` is hardcoded in a few places. Decide if locale should be configurable or based on user profile.
- **Testing strategy**: Parked for now (per request), but still a high-leverage safety net for the scoring engine.
