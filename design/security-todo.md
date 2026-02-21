# Security To-Do

Remaining security work following the initial audit and fix pass (Feb 2026).
Items are ordered by priority.

---

## Low priority

### 1. CSP `unsafe-inline` (acknowledged trade-off)

The Content-Security-Policy header added to `__root.tsx` uses `'unsafe-inline'`
for scripts because TanStack Start injects inline scripts for SSR hydration.
This weakens XSS protection — a nonce-based CSP would be strictly safer.

**Fix**: Revisit when TanStack Start exposes a nonce injection API. Track the
upstream issue. No immediate action required.

---

### 2. RLS policies remain `USING (true)` (defense-in-depth)

Supabase RLS policies on most tables use `USING (true) WITH CHECK (true)` for
authenticated users, meaning any authenticated Supabase client session can
read or write any row. Because Drizzle uses a direct Postgres superuser
connection, RLS is bypassed entirely for all current data access — so this
has no immediate impact.

**Fix**: Tighten RLS policies in `supabase/setup.sql` to scope access by
tournament membership. Only worth doing if a Supabase JS client data path is
ever introduced (e.g. realtime subscriptions).

---

## Already done (Feb 2026)

### First pass

- `requireAuth()` added to all 15 unprotected GET server functions
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy (`__root.tsx`)
- Rate limiting on `signInFn` (10/15 min) and `signUpFn` (5/15 min)
- `signInFn` password validator corrected from `min(1)` to `min(8)`
- `.max()` limits added to all string fields in `validators.ts`
- ILIKE wildcard injection sanitised in `searchPersonsFn`
- `.env.example` corrected to `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` example updated with `?sslmode=require`
- `.gitignore` expanded: `.env.production`, `.env.staging`, `*.pem`, `*.key`, `*.cert`
- Runtime env var validation added (`src/lib/env.ts`), wired into `src/db/index.ts`
- npm audit — all critical/high findings are dev-only transitive deps, no
  production runtime exposure

### Second pass

- IDOR authorization checks added to all sensitive GET endpoints:
  `getTournamentFn`, `getCompetitionsFn`, `getTournamentStandingsFn`,
  `getScorecardFn`, `getScoreHistoryFn`, `getRoundFn`, `getRoundCompetitionsFn`,
  `getCompetitionFn`, `computeStandingsFn` — via new `requireTournamentParticipant`
  and `verifyTournamentMembership` helpers in `auth.helpers.ts`
- `safeHandler` / `safeHandlerNoArg` HOFs added (`src/lib/server-utils.ts`) to
  catch and sanitise unexpected DB/Postgres errors on all high-risk mutation
  handlers (`createCourseFn`, `updateCourseFn`, `createTournamentFn`,
  `addParticipantFn`, `createRoundFn`, `addRoundParticipantFn`, `submitScoreFn`)
- Rate limiting added to `computeStandingsFn` (30 req/user/min)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` added to `env.ts`
  validation; `supabase.server.ts` updated to use `env.*` instead of
  `process.env.*!`
- Dual lockfile resolved: `yarn.lock` deleted; npm (`package-lock.json`) is the
  single package manager
