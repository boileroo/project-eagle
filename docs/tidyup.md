# Aerie Codebase Tidy-Up Plan

This document is a comprehensive, per-file action plan for refactoring the entire Aerie codebase from "vibe-coded MVP" to maintainable, human-quality code.

## Overview

- **Project**: Aerie (golf tournament management app)
- **Stack**: TanStack Start + TanStack Router + React 19 + Supabase + Drizzle + TanStack Query + PWA
- **Scope**: Every file in `src/` — routes, components, lib, hooks, types
- **Goal**: Make the codebase findable, type-safe, consistent, and testable

---

## Phase 1: Infrastructure & Types

### 1.1 Create Consolidated Type Files

Create `src/types/index.ts` that re-exports from domain-specific files. Each type file goes in `src/types/`.

#### Action: Create `src/types/account.ts`

```typescript
export type AccountData = {
  id: string;
  email: string;
  fullName: string;
  nickname: string | null;
  avatarUrl: string | null;
  handicap: number | null;
  createdAt: string;
};
```

#### Action: Create `src/types/course.ts`

```typescript
export type CourseData = {
  id: string;
  name: string;
  holes: HoleData[];
  totalPar: number;
};

export type HoleData = {
  number: number;
  par: number;
  strokeIndex: number;
};

export type CourseListItem = {
  id: string;
  name: string;
  holeCount: number;
  totalPar: number;
};
```

#### Action: Create `src/types/person.ts`

```typescript
export type Guest = {
  id: string;
  name: string;
  handicap: number | null;
  email: string | null;
  phone: string | null;
};

export type PersonSearchResult = Guest & {
  type: 'guest';
};
```

#### Action: Create `src/types/round.ts`

```typescript
export type ActiveRound = {
  id: string;
  tournamentId: string;
  courseId: string;
  roundNumber: number;
  date: string;
  status: RoundStatus;
  scoringType: ScoringType;
  // ... other fields
};

export type RoundSummary = {
  id: string;
  tournamentId: string;
  roundNumber: number;
  date: string;
  status: RoundStatus;
  scoringType: ScoringType;
  courseName: string;
  participantCount: number;
};

export type CompetitionsData = {
  // REMOVE this — replace with RoundCompetitionsData
};
```

**Fix**: Rename `CompetitionsData` to `RoundCompetitionsData` or `RoundCompetitions` to avoid confusion with `CompetitionData`.

#### Action: Create `src/types/score.ts`

```typescript
export type SubmitScoreVariables = {
  roundId: string;
  competitionId: string;
  participantId: string;
  holeNumber: number;
  strokes: number;
  points?: number;
};
```

#### Action: Create `src/types/tournament.ts`

**Fix**: Remove duplicate alias `TournamentLoaderData` vs `TournamentData` — keep one.

#### Action: Create `src/types/competition.ts`

**Fix**:

- `LeaderboardRow` is hand-written and will drift from server return type. Use `z.infer` from a Zod schema or generate from DB query type.
- Fix `gross` vs `gross_strokes` inconsistency — use `grossStrokes` consistently.

#### Action: Create `src/types/index.ts`

```typescript
export * from './account';
export * from './course';
export * from './person';
export * from './round';
export * from './score';
export * from './tournament';
export * from './competition';
```

---

### 1.2 Fix Server-Only File Naming

Rename these files to end with `.server.ts` so they're clearly server-only:

| Current                   | New                                     |
| ------------------------- | --------------------------------------- |
| `src/lib/auth.helpers.ts` | `src/lib/server/auth.helpers.server.ts` |
| `src/lib/server-utils.ts` | `src/lib/server/server-utils.server.ts` |
| `src/lib/rate-limit.ts`   | `src/lib/server/rate-limit.server.ts`   |
| `src/lib/env.ts`          | `src/lib/server/env.server.ts`          |

After renaming, update all import paths throughout the codebase.

---

## Phase 2: Server Functions Splitting

### 2.1 Split `src/lib/competitions.server.ts` (1062 lines)

Split into 4 focused files in `src/lib/server/`:

1. **`competitions.server.ts`** — CRUD operations, bonus awards (keep ~300 lines)
2. **`scoreboards.server.ts`** — scoreboard computation
3. **`standings.server.ts`** — standings computation
4. **`game-decisions.server.ts`** — game decision logic

#### Action: Create `src/lib/server/scoreboards.server.ts`

Move functions:

- `getIndividualScoreboardFn`
- `getTournamentLeaderboardFn`
- Any scoreboard-specific helpers

#### Action: Create `src/lib/server/standings.server.ts`

Move functions:

- `getCompetitionStandingsFn`
- Any standings-specific helpers

#### Action: Create `src/lib/server/game-decisions.server.ts`

Move functions:

- `getGameDecisionsFn`
- Any game-decision-specific helpers

#### Action: In `competitions.server.ts`

Extract duplicated utilities that appear 3+ times:

- `mapToParticipantData` → move to `src/lib/domain/mappers.ts`
- `mapToHoleData` → move to `src/lib/domain/mappers.ts`
- `buildBonusAwardInputs` → move to `src/lib/domain/mappers.ts`
- `resolveAndMapScores` → move to `src/lib/domain/mappers.ts`

---

### 2.2 Split `src/lib/tournaments.server.ts` (914 lines)

Split into 2 focused files:

1. **`tournaments.server.ts`** — CRUD, tournament settings, status
2. **`participants.server.ts`** — participant management (NEW FILE)

#### Action: Create `src/lib/server/participants.server.ts`

Move functions:

- `getTournamentParticipantsFn`
- `addParticipantFn`
- `removeParticipantFn`
- `getInviteCodeFn`
- Any participant-specific helpers

#### Action: In `tournaments.server.ts`

Keep:

- Tournament CRUD
- Tournament settings
- Status helpers

---

### 2.3 Extract Shared Utilities

#### Action: Create `src/lib/server/invite-codes.server.ts`

Extract `generateInviteCode()` from:

- `tournaments.server.ts`
- `rounds.server.ts`

The two implementations use different word lists — choose one word list and standardize.

#### Action: In `tournaments.server.ts` and `teams.server.ts`

Extract `requireSetup()` to a shared utility in `src/lib/server/tournaments.server.ts` and import where needed.

---

### 2.4 Fix IDOR Vulnerabilities

#### Action: In `src/lib/server/groups.server.ts`

Add tournament membership check to `getRoundGroupsFn`:

```typescript
// CURRENT (vulnerable):
export const getRoundGroupsFn = createServerFn({ method: 'GET' })
  .validator(() => z.object({ roundId: z.string() }))
  .handler(async () => {
    const session = await requireAuth();
    // NO CHECK: does user have access to this round's tournament?
    // ...
  });

// FIXED:
export const getRoundGroupsFn = createServerFn({ method: 'GET' })
  .validator(() => z.object({ roundId: z.string() }))
  .handler(async ({ data }) => {
    const session = await requireAuth();
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, data.roundId),
      with: { tournament: true },
    });
    if (!round) throw new Error('Round not found');

    const membership = await db.query.tournamentMembers.findFirst({
      where: and(
        eq(tournamentMembers.tournamentId, round.tournamentId),
        eq(tournamentMembers.userId, session.user.id),
      ),
    });
    if (!membership) throw new Error('Access denied');
    // ...
  });
```

---

### 2.5 Transactional Writes

#### Action: In `src/lib/server/tournaments.server.ts`

Wrap multi-step writes in `lockTournamentFn` and `unlockTournamentFn` with a transaction:

```typescript
import { db } from '../db';
import { tournamentStatus } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export const lockTournamentFn = createServerFn({ method: 'POST' })
  .validator(() => z.object({ tournamentId: z.string() }))
  .handler(async ({ data }) => {
    await db.transaction(async (tx) => {
      await tx
        .update(tournaments)
        .set({ status: 'locked' })
        .where(eq(tournaments.id, data.tournamentId));

      // Audit log, notifications, etc.
    });
  });
```

---

### 2.6 Fix Query Client Server Import

#### Action: In `src/lib/query-client.ts`

Remove the server-only import of `submitScoreFn`:

```typescript
// REMOVE THIS:
import { submitScoreFn } from './scores.server';

// Instead, the query client should NOT know about server functions directly.
// It should rely on TanStack Query's invalidateQueries from the client.
```

Move server function invalidation logic to the client hook `use-score-mutation.ts`.

---

## Phase 3: Domain Engine Improvements

### 3.1 Shared Rank Helper

#### Action: Create `src/lib/domain/rank.ts`

Extract the rank assignment algorithm (appears in 4 files) into a shared helper:

```typescript
export function assignRanks<T>(
  items: T[],
  getScore: (item: T) => number,
  options?: { descending?: boolean },
): Map<string, number> {
  // Current implementation from standings.ts, individual-scoreboard.ts, etc.
  // Normalize to one canonical version
}
```

Update these files to use the shared helper:

- `src/lib/domain/standings.ts`
- `src/lib/domain/individual-scoreboard.ts`
- `src/lib/domain/tournament-leaderboard.ts`
- Any other file with rank logic

---

### 3.2 Shared Mappers

#### Action: Create `src/lib/domain/mappers.ts`

Extract duplicated functions (currently appear 3+ times in `competitions.server.ts`):

```typescript
export function mapToParticipantData(
  participant: ParticipantWithRelations,
): ParticipantData {
  // Current implementation
}

export function mapToHoleData(hole: Hole): HoleScore {
  // Current implementation
}

export function buildBonusAwardInputs(
  competition: Competition,
  participants: Participant[],
): BonusAwardInput[] {
  // Current implementation
}

export function resolveAndMapScores(
  scores: Score[],
  competition: Competition,
  participants: Participant[],
): ResolvedScore[] {
  // Current implementation
}
```

---

### 3.3 Fix Standings Duplication

#### Action: In `src/lib/domain/standings.ts`

1. Extract `buildPlayerTeamMap` — appears 3 times, make it a reusable function
2. Fix `aggregateMatchWins` to reuse `TotalsEntry` type instead of duplicating inline

---

### 3.4 Fix Mutable Group Properties

#### Action: In `src/lib/domain/match-play.ts`, `best-ball.ts`, `hi-lo.ts`

Remove post-construction property mutation:

```typescript
// BEFORE (mutation):
const result = calculateMatch(...);
result.groupId = groupId;
result.groupName = groupName;
return result;

// AFTER (functional):
const result = calculateMatch(..., groupId, groupName);
return result;
```

Update `calculateMatch` to accept groupId and groupName as parameters or options object.

---

### 3.5 Fix Match-Play Options Object

#### Action: In `src/lib/domain/match-play.ts`

Change `calculateMatch` from 10 positional arguments to an options object:

```typescript
// BEFORE:
export function calculateMatch(
  player1Score: number,
  player2Score: number,
  player1Name: string,
  player2Name: string,
  hole1Par: number,
  // ... 6 more
): MatchResult;

// AFTER:
export function calculateMatch(
  scores: [number, number],
  names: [string, string],
  holes: HoleData[],
  options?: { format?: 'stroke' | 'stableford' },
): MatchResult;
```

---

### 3.6 Extract Shared Match Outcome Logic

#### Action: In `src/lib/domain/best-ball.ts`

Extract match outcome text logic that duplicates between `match-play.ts` and `best-ball.ts` into a shared utility.

---

### 3.7 Fix Scoring Utils

#### Action: In `src/lib/scoring-utils.ts`

1. Fix `parLabel` to handle -3 (albatross):

   ```typescript
   export function parLabel(strokes: number, par: number): string {
     const diff = strokes - par;
     if (diff <= -4) return 'Albatross';
     // ...
   }
   ```

2. Fix `shortName` to cap characters:
   ```typescript
   export function shortName(name: string, maxLength = 20): string {
     if (name.length <= maxLength) return name;
     return name.slice(0, maxLength - 1) + '…';
   }
   ```

---

### 3.8 Fix Other Domain Bugs

| File                                  | Issue                                                       | Fix                                                                         |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/domain/stableford.ts:84`     | Dead variable `holesByNumber`                               | Remove                                                                      |
| `src/lib/domain/six-point.ts`         | No group size validation                                    | Add validation                                                              |
| `src/lib/domain/chair.ts`             | No group size validation                                    | Add validation                                                              |
| `src/lib/domain/team-colours.ts`      | Negative index bug in `getTeamColour`                       | Add guard: `if (index < 0) return defaultColor`                             |
| `src/lib/domain/handicaps.ts`         | Silent NaN→0 fallback                                       | Add warning/log: `if (isNaN(hcp)) console.warn('Invalid handicap:', value)` |
| `src/lib/domain/tournament-status.ts` | `string[]` param should be `RoundStatus[]`                  | Use proper enum type                                                        |
| `src/lib/domain/tournament-status.ts` | `isTournamentInSetup` takes `string` not `TournamentStatus` | Fix type                                                                    |

---

### 3.9 Add JSDoc to Domain Functions

Add JSDoc to all exported functions in:

- `src/lib/domain/stroke-play.ts`
- `src/lib/domain/match-play.ts`
- `src/lib/domain/best-ball.ts`
- `src/lib/domain/hi-lo.ts`
- `src/lib/domain/rumble.ts`
- `src/lib/domain/wolf.ts`
- `src/lib/domain/six-point.ts`
- `src/lib/domain/chair.ts`
- `src/lib/domain/bonus.ts`
- `src/lib/domain/individual-scoreboard.ts`
- `src/lib/domain/tournament-leaderboard.ts`

---

## Phase 4: Split Validators

### Action: Split `src/lib/validators.ts` (318 lines)

Create `src/lib/validators/` folder with domain-specific files:

| File                                | Content                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `src/lib/validators/index.ts`       | Re-export all                                                 |
| `src/lib/validators/auth.ts`        | Auth-related schemas                                          |
| `src/lib/validators/course.ts`      | Course schemas                                                |
| `src/lib/validators/tournament.ts`  | Tournament schemas                                            |
| `src/lib/validators/round.ts`       | Round schemas                                                 |
| `src/lib/validators/score.ts`       | Score schemas                                                 |
| `src/lib/validators/competition.ts` | Competition schemas                                           |
| `src/lib/validators/shared.ts`      | Shared field schemas (handicapField, dateField, teeTimeField) |

For each validator, extract reusable field schemas:

```typescript
// Example: src/lib/validators/shared.ts
export const handicapField = z.coerce.number().min(-10).max(54);
export const dateField = z.string().datetime();
export const teeTimeField = z.string().regex(/^\d{2}:\d{2}$/);
```

---

## Phase 5: Hooks Extraction

### Action: Create Consolidated Query Options

#### Action: Create `src/lib/query-options.ts`

Consolidate all query option factories here:

- `roundQueryOptions`
- `scorecardQueryOptions`
- `competitionsQueryOptions`
- `tournamentLeaderboardQueryOptions`

Remove duplicate definitions from:

- `src/routes/_app/tournaments/$tournamentId/index.tsx`
- `src/routes/_app/tournaments/$tournamentId/rounds/$roundId/index.tsx`
- `src/components/pages/tournament-detail-page/components/leaderboard/leaderboard-section.tsx`

---

### Action: Create New Hooks

Create these hooks in `src/hooks/`:

| Hook                                 | Extract From                                     | Purpose                                  |
| ------------------------------------ | ------------------------------------------------ | ---------------------------------------- |
| `src/hooks/use-active-round.ts`      | `rounds/$roundId/index.tsx`                      | Active round state + localStorage resume |
| `src/hooks/use-round-permissions.ts` | `round-detail-page.tsx`, `live-scoring-page.tsx` | Role/editability logic                   |
| `src/hooks/use-scoring-resume.ts`    | `live-scoring-page.tsx`                          | localStorage resume logic                |
| `src/hooks/use-confirm-dialog.ts`    | 8+ files with delete dialogs                     | Open/loading/handler state pattern       |
| `src/hooks/use-clipboard.ts`         | `invite-panel.tsx`, `share-dialog.tsx`           | Clipboard copy logic                     |
| `src/hooks/use-offline-fallback.ts`  | `_app.tsx`                                       | Offline state handling                   |

---

### Fix Existing Hooks

#### Action: In `src/hooks/use-online-status.ts`

Fix to set offline state on mount if already offline:

```typescript
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // FIX: Set initial state correctly
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

#### Action: In `src/hooks/use-score-realtime.ts`

Fix issues:

- Non-atomic invalidation → use `queryClient.invalidateQueries` once with wildcard
- Redundant SSR guard → remove `if (!client) return`
- Repeated auth listener → extract to shared hook or remove duplicates

---

## Phase 6: Component Decomposition

### 6.1 Round Detail Page (CRITICAL)

**File**: `src/components/pages/round-detail-page.tsx` (947 lines)

#### Action: Create folder structure

```
src/components/pages/round-detail-page/
├── round-detail-page.tsx       # ~80 lines: loader, query options, render sections
├── components/
│   ├── round-header/
│   │   ├── round-header.tsx
│   │   ├── round-step-indicator.tsx   # EXTRACT from inline
│   │   └── round-actions.tsx
│   ├── scorecard-section/
│   │   ├── scorecard-section.tsx
│   │   └── section-pairing-card.tsx
│   ├── hooks/
│   │   └── use-match-pairings.ts     # EXTRACT 200-line useMemo
│   ├── competitions/
│   │   ├── competitions-section.tsx
│   │   ├── add-bonus-comp-dialog.tsx
│   │   ├── add-individual-comp-dialog.tsx
│   │   ├── add-team-comp-dialog.tsx
│   │   ├── configure-matches-dialog.tsx
│   │   ├── edit-competition-dialog.tsx  # FIX 30+ as-casts
│   │   ├── bonus-comp-row.tsx
│   │   ├── delete-round-dialog.tsx     # EXTRACT from inline
│   │   └── competition-fields/
│   │       ├── points-fields.tsx        # NEW shared form fields
│   │       ├── bonus-mode-fields.tsx    # NEW shared form fields
│   │       └── scoring-basis-radio.tsx  # NEW shared form fields
│   ├── round-settings/
│   │   ├── edit-round-dialog.tsx
│   │   └── edit-round-handicap-dialog.tsx
│   └── individual-scoreboard-section.tsx
```

#### Action: Fix `edit-competition-dialog.tsx`

Replace 30+ `as` casts with a `parseCompetitionConfig()` utility:

```typescript
// src/lib/competitions.ts (or utils)
export function parseCompetitionConfig(
  config: unknown,
  formatType: FormatType,
): CompetitionConfig {
  const schemas: Record<FormatType, z.ZodType<CompetitionConfig>> = {
    stableford: StablefordConfigSchema,
    stroke: StrokeConfigSchema,
    // ...
  };
  return schemas[formatType].parse(config);
}
```

#### Action: Rewrite `round-detail-page.tsx`

Make it thin (~80 lines):

```typescript
export default function RoundDetailPage() {
  const { roundId } = useParams({ from: '/tournaments/:tournamentId/rounds/:roundId' });
  const { data: round } = useQuery(roundQueryOptions(roundId));
  const { data: competitions } = useQuery(competitionsQueryOptions(roundId));

  if (!round) return <Loading />;

  return (
    <div className="container">
      <RoundHeader round={round} />
      <ScorecardSection round={round} />
      <CompetitionsSection competitions={competitions} round={round} />
      <IndividualScoreboardSection round={round} />
    </div>
  );
}
```

---

### 6.2 Competition Results

**File**: `src/components/competition-results.tsx` (657 lines)

#### Action: Decompose into sub-components

```
src/components/shared/competition-results/
├── competition-results.tsx       # Container
├── components/
│   ├── point-leaderboard.tsx    # NEW — merge SixPoint + Chair (they are identical)
│   ├── match-results.tsx         # NEW — shared layout for MatchPlay + BestBall + HiLo
│   ├── stableford-leaderboard.tsx
│   ├── stroke-play-leaderboard.tsx
│   └── rumble-results.tsx
└── utils.ts                     # formatRelativeToPar, groupMatchesByGroup
```

#### Action: Merge SixPointLeaderboard + ChairLeaderboard

These two components are **identical**. Create one `PointLeaderboard` component:

```typescript
// src/components/shared/competition-results/components/point-leaderboard.tsx
export function PointLeaderboard<
  T extends { points: number; participant: { name: string } },
>({ participants, title }: { participants: T[]; title: string }) {
  // Current implementation (identical in both files)
}
```

---

### 6.3 Live Scoring Page

**File**: `src/components/live-scoring-page.tsx` (312 lines)

#### Action: Create folder structure

```
src/components/pages/live-scoring-page/
├── live-scoring-page.tsx          # ~100 lines: loader, render sections
├── components/
│   ├── bonus-award-control.tsx    # MOVE from components/live-scoring/
│   ├── group-selector.tsx
│   ├── hole-header.tsx
│   ├── hole-navigation.tsx
│   ├── player-score-card.tsx      # FIX: use shared score-input
│   ├── running-totals.tsx
│   └── wolf-declaration-control.tsx
```

#### Action: Extract role/editability logic

Move to `use-round-permissions.ts` hook.

#### Action: Extract localStorage resume logic

Move to `use-scoring-resume.ts` hook.

---

### 6.4 Dashboard Page

**File**: `src/components/pages/dashboard-page.tsx` (268 lines)

#### Action: Create folder structure

```
src/components/pages/dashboard-page/
├── dashboard-page.tsx            # ~100 lines
├── components/
│   ├── join-tournament-dialog.tsx  # EXTRACT from inline
│   └── active-round-card.tsx
```

---

### 6.5 Groups Tab

**File**: `src/components/pages/tournament-detail-page/components/groups/groups-tab.tsx` (331 lines)

#### Action: Extract PlayerRow component

Create `src/components/pages/tournament-detail-page/components/groups/components/player-row.tsx`.

#### Action: Extract AutoAssignDialog

Extract from inline rendering into its own component.

---

### 6.6 Guests Page

**File**: `src/components/pages/guests-page.tsx` (198 lines)

#### Action: Create folder structure

```
src/components/pages/guests-page/
├── guests-page.tsx              # ~80 lines
├── components/
│   ├── edit-guest-dialog.tsx    # EXTRACT from inline
│   └── delete-guest-dialog.tsx  # EXTRACT from inline
```

---

### 6.7 Tournaments Page

**File**: `src/components/pages/tournaments-page.tsx` (258 lines)

#### Action: Create folder structure

```
src/components/pages/tournaments-page/
├── tournaments-page.tsx        # ~100 lines
└── components/
    ├── tournament-card.tsx     # EXTRACT from inline
    └── single-round-card.tsx   # EXTRACT from inline
```

---

### 6.8 Route Files

#### Action: In `src/routes/_app/tournaments/$tournamentId/rounds/$roundId/index.tsx`

1. Move localStorage effect to `use-active-round.ts` hook
2. Use consolidated query options from `src/lib/query-options.ts`

#### Action: In `src/routes/_app/tournaments/$tournamentId/index.tsx`

1. Use consolidated query options from `src/lib/query-options.ts`

---

### 6.9 App Layout

#### Action: Create `src/components/app/app-layout.tsx`

Extract from `src/routes/_app.tsx` (123 lines):

```typescript
// src/components/app/app-layout.tsx
export function AppLayout() {
  const { user } = useAuth();
  // Header, sidebar, outlet, offline fallback
}
```

Update `src/routes/_app.tsx`:

```typescript
// src/routes/_app.tsx
import { AppLayout } from '@/components/app/app-layout';

export default function AppRoute() {
  return <AppLayout />;
}
```

---

## Phase 7: Shared UI Components

### 7.1 Confirm Dialog

#### Action: Create `src/components/shared/confirm-dialog/confirm-dialog.tsx`

Shared delete/confirm dialog used in 8+ files:

```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}
```

Update these files to use the shared component:

- `tournament-detail-page/components/teams/delete-team-dialog.tsx`
- `round-detail-page/components/competitions/delete-round-dialog.tsx`
- `guests-page/components/delete-guest-dialog.tsx`
- Any other file with a delete/confirm dialog

---

### 7.2 Score Input

#### Action: Merge score input logic

Two components duplicate score input (stepper + grid):

- `src/components/score-entry-dialog/score-entry-dialog.tsx`
- `src/components/live-scoring/player-score-card.tsx`

Create shared `src/components/shared/score-input/`:

```
src/components/shared/score-input/
├── score-input.tsx         # Container
├── score-stepper.tsx       # Stepper component
└── quick-score-grid.tsx   # Grid component
```

Update both original components to import from shared location.

---

### 7.3 Competition Form Fields

#### Action: Create shared form field components

These fields are duplicated 6+ times across competition forms:

- `PointsFields`
- `BonusModeFields`
- `ScoringBasisRadio`

Create `src/components/shared/competition-form-fields/`:

```
src/components/shared/competition-form-fields/
├── points-fields.tsx
├── bonus-mode-fields.tsx
└── scoring-basis-radio.tsx
```

Update:

- `round-detail-page/components/competitions/add-individual-comp-dialog.tsx`
- `round-detail-page/components/competitions/edit-competition-dialog.tsx`
- Any other file with these fields

---

### 7.4 Invite Panel + Share Dialog

#### Action: Use shared clipboard hook

Both `invite-panel.tsx` and `share-dialog.tsx` duplicate clipboard logic.

Update both to use `useClipboard` hook:

```typescript
// In both files:
const { copy, copied } = useClipboard();
```

---

### 7.5 Tournament Detail

#### Action: Move files to proper folder

The `components/tournament-detail/` folder should be under `pages/tournament-detail-page/components/`:

```
src/components/pages/tournament-detail-page/
├── tournament-detail-page.tsx
└── components/
    ├── tournament-header/
    ├── leaderboard/
    ├── groups/
    ├── rounds/
    ├── participants/
    ├── teams/
    ├── add-participant-dialog.tsx      # MOVE from components root
    ├── add-round-dialog.tsx            # MOVE
    ├── edit-handicap-dialog.tsx        # MOVE
    ├── invite-panel.tsx                # MOVE
    └── share-dialog.tsx                # MOVE
```

---

### 7.6 Edit Handicap Dialogs

#### Action: Merge or share

Two near-identical files:

- `src/components/tournament-detail/edit-handicap-dialog.tsx`
- `src/components/round-detail/edit-round-handicap-dialog.tsx`

Either:

1. Create one shared `EditHandicapDialog` component with optional `roundId` prop
2. Or keep separate but extract common logic to a hook

---

## Phase 8: Fix Anti-Patterns

### 8.1 Join Page useEffect

#### Action: In `src/routes/join.tsx`

Replace `useEffect` data fetching with route loader:

```typescript
// BEFORE (anti-pattern):
export default function JoinPage() {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    getPublicTournamentsFn().then(setTournaments);
  }, []);

  // ...
}

// AFTER (correct):
export const route = createFileRoute('/join')({
  loader: async () => {
    return getPublicTournamentsFn();
  },
});

export default function JoinPage() {
  const { tournaments } = route.useLoaderData();
  // ...
}
```

---

### 8.2 Fix any Type

#### Action: In `src/components/pages/tournament-detail-page/components/participants/players-tab.tsx:39`

Remove explicit `any`:

```typescript
// BEFORE:
const players = data?.players.filter((p: any) => p.status === 'active') || [];

// AFTER:
const players = data?.players.filter((p) => p.status === 'active') || [];
```

---

### 8.3 Fragile Awaited Pattern

#### Action: In `src/routes/_app/tournaments/$tournamentId/rounds/$roundId/index.tsx`

Replace fragile `Awaited<ReturnType<typeof import(...)>>` with proper types from `src/types/`:

```typescript
// BEFORE:
type LoaderData = Awaited<
  ReturnType<typeof import('./round-detail-page').loadRoundData>
>;

// AFTER:
import type { RoundLoaderData } from '@/types/round';
type LoaderData = RoundLoaderData;
```

---

## Phase 9: Configuration

### 9.1 Apple Splash

#### Action: Move to config

Move `src/lib/apple-splash.ts` to `src/config/apple-splash.ts` and add `as const`:

```typescript
// src/config/apple-splash.ts
export const APPLE_SPLASH_SCREENS = {
  iphone: [
    { src: '/apple-splash/iphone-0.png', width: 0, height: 0, dark: false },
    // ...
  ],
} as const;
```

---

### 9.2 Supabase Server Fix

#### Action: In `src/lib/server/supabase.server.ts`

Fix incorrect `sameSite` type cast:

```typescript
// BEFORE:
cookies.set(name, value, {
  sameSite: 'lax' as any, // WRONG
});

// AFTER:
cookies.set(name, value, {
  sameSite: 'lax', // CORRECT — 'lax' | 'strict' | 'none' are valid
});
```

---

### 9.3 Env Server Fix

#### Action: In `src/lib/server/env.server.ts`

Fix validation:

- Trim whitespace from env vars
- Validate URLs properly

```typescript
// src/lib/server/env.server.ts
export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  // ...
};

// Add URL validation:
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

---

## Phase 10: Cleanup Barrel Files

### 10.1 Remove Redundant Re-Exports

#### Action: Remove barrel files that just re-export

These barrel files add no value and should be removed or fixed:

- `src/components/round-detail/index.ts`
- `src/components/tournament-detail/index.ts`

The parent page should import directly from component files, not through a barrel.

---

### 10.2 Add Missing Barrel Files

#### Action: Create `src/components/pages/index.ts`

```typescript
export { AccountPage } from './account-page/account-page';
export { CourseDetailPage } from './course-detail-page/course-detail-page';
// ... all pages
```

---

## Phase 11: Documentation

### 11.1 Write This Plan

The plan you are reading should be written to `docs/tidyup.md`.

### 11.2 Update AGENTS.md

Expand `AGENTS.md` from component-only to cover all conventions:

#### Add sections for:

**Types:**

- Where to define types (feature-specific vs shared)
- Naming conventions (Data, Item, Summary, LoaderData)
- When to use Zod schemas vs manual types

**Server Functions:**

- File naming (`*.server.ts`)
- Error handling (safeHandler usage)
- IDOR protection requirements
- Transaction requirements for multi-step writes

**Hooks:**

- When to extract to a hook
- Naming conventions (`use-*`)
- SSR-safe patterns

**Forms:**

- Field schema patterns (shared vs inline)
- Dialog component patterns

**Error Handling:**

- SafeHandler wrapper requirements
- Structured error responses

---

## Implementation Order

### Batch 1: Infrastructure (can be parallelized)

1. Rename server files to `.server.ts`
2. Create type files in `src/types/`
3. Create `src/lib/query-options.ts`
4. Fix validators (split into folder)

### Batch 2: Server Functions (sequential)

1. Split `competitions.server.ts` → 4 files
2. Split `tournaments.server.ts` → 2 files
3. Create `invite-codes.server.ts`
4. Fix IDOR vulnerabilities
5. Add transactions where needed

### Batch 3: Domain Engine (sequential)

1. Create `rank.ts` helper
2. Create `mappers.ts`
3. Fix mutable properties in match-play, best-ball, hi-lo
4. Fix bugs (scoring-utils, team-colours, etc.)
5. Add JSDoc

### Batch 4: Hooks (parallelizable)

1. Create all new hooks
2. Fix existing hooks
3. Update components to use hooks

### Batch 5: Components (most critical first)

1. Round detail page decomposition (CRITICAL)
2. Competition results decomposition
3. Live scoring page
4. All other page folders

### Batch 6: Shared Components

1. Create confirm-dialog
2. Create score-input
3. Create competition-form-fields
4. Update invite-panel + share-dialog

### Batch 7: Routes

1. Fix join-page useEffect
2. Use consolidated query options
3. Extract app-layout

### Batch 8: Final Cleanup

1. Write AGENTS.md
2. Fix any remaining lint errors
3. Verify typecheck passes

---

## Verification Commands

Run these after each batch to verify progress:

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# If tests exist
npm run test
```

---

## Notes for Implementation

1. **Run one batch at a time** — don't try to do everything in parallel
2. **Run verification commands after each batch** — catch issues early
3. **Update import paths** — every file move/rename requires updating imports
4. **Don't skip JSDoc** — future maintainers will thank you
5. **Test manually** — the app should still work after each batch
