# Cleanup

Tech debt and structural improvements to existing code. Check off and remove items as they're completed.

---

## Monolith Components

- [x] Extract `round-detail-page.tsx` (3,400 lines, ~13 inline sub-components) into `src/components/round-detail/` with individual files per component and a barrel re-export
- [x] Extract `tournament-detail-page.tsx` (1,960 lines, ~7 inline sub-components) into `src/components/tournament-detail/` with the same pattern
- [x] Extract shared `PersonSearchDialog` from the near-identical `AddParticipantDialog` in both pages (search + create guest tabs)

## Server Validation

- [x] Replace all passthrough `.inputValidator((data: T) => data)` calls with Zod `.parse()` — currently ~30+ server functions across 8 files do zero runtime validation
- [x] Repurpose the 64 unused drizzle-zod schemas in `schema.ts` (lines 627–767) for this, or remove them if hand-written validators in `validators.ts` are preferred

## Database Indexes

- [x] Add indexes on high-traffic FK columns — none exist today. Priority: `scoreEvents(roundId)`, `scoreEvents(roundParticipantId)`, `roundParticipants(roundId)`, `rounds(tournamentId)`, `competitions(roundId)`, `tournamentParticipants(tournamentId)`, `bonusAwards(competitionId)`

## Duplicated Logic

- [ ] Extract shared `resolveLatestScores()` helper — the "iterate events DESC, skip seen via Set" pattern is duplicated between `scores.server.ts` (getScorecardFn) and `competitions.server.ts` (computeStandingsFn)
- [ ] Consolidate the three `aggregate*` functions in `domain/standings.ts` that share team-mapping, totals-accumulation, and sorting boilerplate into a generic `aggregateStandings()` parameterized by a per-round extractor

## Query Performance

- [ ] Fix N+1 in `computeStandingsFn` — currently loops rounds sequentially with a separate `scoreEvents` query per round. Batch into a single `WHERE roundId IN (...)` query
- [ ] Move `StandingsSection` computation from client-side `useEffect` into the route loader to eliminate the waterfall after initial render

## Dead Code

- [ ] Delete `src/lib/collections.ts` — empty stub (`export {}`) left over from TanStack DB setup
