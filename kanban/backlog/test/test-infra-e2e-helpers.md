# Test Infrastructure: E2E Helpers

## What

Build the shared utilities that all E2E tests depend on: authentication, test data seeding, and common helper functions.

## Context

This card must follow `test-infra-playwright` and must be completed before any E2E scenario card can be started.

All E2E tests share a common need: an authenticated session with a known test user, a clean database state before each test, and helper functions for creating the standard building blocks (rounds, tournaments, participants, groups, competitions, scores).

**Authentication strategy:**

- Create a dedicated test user in Supabase (e.g. `test@eagle.test`) with a known password stored in `.env.test` (gitignored)
- In a global Playwright setup file (`e2e/global-setup.ts`), log in once and save `storageState` to `e2e/.auth/user.json`
- All tests reference this saved state via `use: { storageState }` in `playwright.config.ts` — no test repeats the login flow

**Database seeding strategy:**

- Create `e2e/helpers/seed.ts` with functions to create a standard test course (18 holes, known par/stroke-index values) via the server API or directly via the DB
- Tests that need a clean state call a teardown helper that deletes test-created rounds/tournaments by a known prefix (e.g. `[TEST]`)
- The test course is created once in global setup and reused

**Helper functions to build (`e2e/helpers/`):**

- `auth.ts` — login, logout, get current user
- `seed.ts` — ensure test course exists, create baseline data
- `round.ts` — createRound, addParticipant, addGroup, addCompetition, openRound, finalizeRound
- `tournament.ts` — createTournament, addRound, addParticipant, lockTournament, etc.
- `scores.ts` — enterScore(roundId, participantId, hole, strokes), enterAllScores(preset)
- `teams.ts` — enableTeams, createTeam, assignPlayerToTeam
- `navigation.ts` — goToRound, goToTournament, goToLiveScoring

**Score presets:**

Define a few standard score sets for 18 holes (e.g. `ALL_PARS`, `ONE_UNDER_EACH_HOLE`, `SCRATCH_ROUND`) so test files don't need to hard-code 18 numbers. Different participants can be given different presets to produce predictable leaderboard outcomes.

## Done When

- `e2e/global-setup.ts` logs in and saves session to `e2e/.auth/user.json`
- `e2e/.auth/` is gitignored
- All helper modules exist and are importable from test files
- A test course with known hole data exists and is reusable across tests
- A simple integration test (e.g. "can navigate to dashboard after login") uses the saved session and passes
- `.env.test.example` documents the required env vars for other developers
