# Component Development Guide

This guide explains how to structure components in this project.

## Page Structure

Each page should be in its own folder under `src/components/pages/`:

```
src/components/pages/
├── tournament-detail-page/
│   ├── tournament-detail-page.tsx    # Main page (thin wrapper)
│   └── components/                    # Page-specific components
│       ├── leaderboard/
│       │   ├── leaderboard-section.tsx
│       │   ├── leaderboard-table.tsx
│       │   └── trophy-icon.tsx
│       ├── teams/
│       │   ├── teams-tab.tsx
│       │   ├── team-item.tsx
│       │   ├── delete-team-dialog.tsx
│       │   └── disable-teams-dialog.tsx
│       ├── groups/
│       ├── rounds/
│       ├── participants/
│       └── tournament-actions/
│           ├── tournament-actions.tsx
│           └── components/             # Discrete action buttons
│               ├── delete-tournament-button.tsx
│               ├── lock-tournament-button.tsx
│               └── ...
```

## Key Principles

### 1. Folder Structure

- Main page file at folder root
- Supporting components in `components/` subfolder
- For complex features, use nested `components/` folder for discrete pieces

### 2. Barrel Files (index.ts)

- Only use when necessary (required by TypeScript for folder imports)
- Avoid redundant re-exports

### 3. Component Organization

**Wrapper/Container components** (in folder root):

- Manage state
- Handle logic
- Compose smaller components
- Example: `teams-tab.tsx`, `leaderboard-section.tsx`

**Discrete components** (in `components/` subfolder):

- Single responsibility
- Reusable where appropriate
- Example: `delete-team-dialog.tsx`, `team-item.tsx`

### 4. Naming Conventions

| Type              | Convention              | Example                  |
| ----------------- | ----------------------- | ------------------------ |
| Page              | `{name}-page.tsx`       | `account-page.tsx`       |
| Section/Container | `{name}.tsx`            | `teams-tab.tsx`          |
| Discrete UI       | `{action}-{target}.tsx` | `delete-team-dialog.tsx` |
| Item/Row          | `{item}.tsx`            | `team-item.tsx`          |

### 5. When to Break Down

Extract into smaller components when:

- Component exceeds ~150 lines
- Component has multiple responsibilities
- Component has inline dialogs or modals
- Component is reused elsewhere
- Component has complex conditional rendering

### 6. Import Paths

Prefer relative imports for co-located components:

```typescript
// Good - components in same feature folder
import { TeamItem } from './components/team-item';

// Also acceptable - shared UI components
import { Button } from '@/components/ui/button';
```

## Creating a New Page

1. Create folder: `src/components/pages/{name}-page/`
2. Create main page file: `{name}-page.tsx`
3. Create `components/` subfolder for supporting components
4. Export from `src/components/pages/index.ts`

## Example: Adding a New Feature Component

Given a large component `participants-section.tsx`:

1. **Create folder**: `src/components/pages/tournament-detail-page/components/participants/`
2. **Move main file**: `participants-section.tsx` → `participants/participants-section.tsx`
3. **Extract discrete pieces**: Create `components/` subfolder for dialogs, items, etc.
4. **Update imports**: Fix relative paths for moved files

```typescript
// Before
import { TeamsTab } from './teams-tab';

// After
import { TeamsTab } from '../teams/teams-tab';
```

## Type Exports

Define types close to where they're used. For shared types:

- If used by parent page → define in parent, pass as props
- If shared across features → define in `src/types/` with domain-specific files

---

# Type Conventions

## Type Location

| Type Scope             | Where to Define                                             |
| ---------------------- | ----------------------------------------------------------- |
| Single component       | In the component file, as `interface` or `type`             |
| Single feature/page    | In `src/components/pages/{feature}/types.ts`                |
| Shared across features | In `src/types/{domain}.ts` (e.g., `account.ts`, `round.ts`) |
| Re-export all          | In `src/types/index.ts`                                     |

## Type Naming Conventions

| Type               | Convention            | Example                     |
| ------------------ | --------------------- | --------------------------- |
| Data from DB       | `{Name}Data`          | `CourseData`, `AccountData` |
| List item          | `{Name}ListItem`      | `CourseListItem`            |
| Summary/Overview   | `{Name}Summary`       | `RoundSummary`              |
| Loader return      | `{Feature}LoaderData` | `TournamentLoaderData`      |
| Form input         | `{Feature}FormData`   | `TournamentFormData`        |
| Mutation variables | `{Action}Variables`   | `SubmitScoreVariables`      |

## Type vs Zod Schema

- Use **Zod schemas** when you need runtime validation (forms, API inputs, config parsing)
- Use **TypeScript types** when you only need compile-time safety (component props, function returns)
- For DB-derived types: define the Zod schema, then use `z.infer<typeof Schema>` for the TypeScript type

```typescript
// Schema first (for validation)
export const CourseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  holes: HoleSchema.array(),
});

// Type derived from schema
export type CourseData = z.infer<typeof CourseSchema>;
```

---

# Server Functions Conventions

## Two-Tier File Structure

Server function files follow a strict two-tier layout:

| Tier              | Location                     | Contains                                                              | Examples                                                              |
| ----------------- | ---------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Domain files**  | `src/lib/*.server.ts`        | `createServerFn` definitions (the actual API surface)                 | `competitions.server.ts`, `scoreboards.server.ts`, `rounds.server.ts` |
| **Utility files** | `src/lib/server/*.server.ts` | Shared helpers, auth, env, rate-limiting — **never** `createServerFn` | `auth.helpers.server.ts`, `env.server.ts`, `rate-limit.server.ts`     |

Domain files import from utility files, never the reverse.

## No Re-Export Barrels for Server Functions

**Never** create barrel/shim files that re-export `createServerFn` definitions from another file. Consumers must import directly from the domain file that defines the function.

```typescript
// BAD — re-export barrel
// src/lib/competitions.server.ts
export { getIndividualScoreboardFn } from './server/scoreboards.server';

// BAD — consumer importing through a barrel
import { getIndividualScoreboardFn } from '@/lib/competitions.server';

// GOOD — consumer imports directly from the defining file
import { getIndividualScoreboardFn } from '@/lib/scoreboards.server';
```

When splitting a large server file, move functions to new domain-tier files in `src/lib/` and update all consumer imports to point there directly. Do not leave re-export shims behind.

## File Naming

All server-only code must end with `.server.ts`. Domain files sit directly in `src/lib/`; utility/helper files go in `src/lib/server/`:

```
src/lib/
├── competitions.server.ts   # domain — contains createServerFn
├── rounds.server.ts         # domain — contains createServerFn
├── tournaments.server.ts    # domain — contains createServerFn
└── server/
    ├── auth.helpers.server.ts   # utility — no createServerFn
    ├── env.server.ts            # utility — no createServerFn
    └── rate-limit.server.ts     # utility — no createServerFn
```

## Error Handling

Use `safeHandler` wrapper for all mutation functions:

```typescript
// Good
export const createTournamentFn = createServerFn({ method: 'POST' })
  .validator(TournamentSchema)
  .handler(
    safeHandler(async ({ data }) => {
      // ... implementation
    }),
  );

// Bad - no error handling wrapper
export const createTournamentFn = createServerFn({ method: 'POST' }).handler(
  async ({ data }) => {
    // direct implementation
  },
);
```

## IDOR Protection

Every function that fetches data by ID must verify the user has access:

```typescript
export const getRoundFn = createServerFn({ method: 'GET' })
  .validator(() => z.object({ roundId: z.string() }))
  .handler(
    safeHandler(async ({ data }) => {
      const session = await requireAuth();

      // Verify membership
      const membership = await db.query.tournamentMembers.findFirst({
        where: and(
          eq(tournamentMembers.tournamentId, round.tournamentId),
          eq(tournamentMembers.userId, session.user.id),
        ),
      });
      if (!membership) throw new Error('Access denied');

      return round;
    }),
  );
```

## Transactions

Multi-step writes must use database transactions:

```typescript
// Good - transaction for multi-step write
export const lockTournamentFn = createServerFn({ method: 'POST' })
  .handler(safeHandler(async ({ data }) => {
    await db.transaction(async (tx) => {
      await tx.update(tournaments)
        .set({ status: 'locked' })
        .where(eq(tournaments.id, data.tournamentId));

      // Additional writes in same transaction
      await tx.insert(auditLog).values({ ... });
    });
  }));

// Bad - separate writes without transaction
export const lockTournamentFn = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    await db.update(tournaments).set({ status: 'locked' }).where(...);
    await db.insert(auditLog).values({ ... }); // If this fails, data is inconsistent
  });
```

---

# Hooks Conventions

## When to Extract

Extract to a hook when:

- Logic is reused in 2+ components
- Component exceeds ~150 lines and logic can be separated
- Complex state management that distracts from rendering
- Side effects (localStorage, event listeners, subscriptions)

## Being Vigilant for Generic / Reusable Logic

When writing new code or refactoring existing code, always be on the lookout for patterns that could be extracted to shared utilities, hooks, or helpers:

- **Repeated inline logic** (e.g., `isCommissioner` checks appearing in 10+ files) → extract to a hook
- **Duplicated predicates** (e.g., `rp.person.userId === userId` repeated across files) → extract to a utility function
- **Duplicate `queryOptions` declarations** → centralize in `src/lib/query-options.ts`
- **Similar component structures** (e.g., multiple files with the same delete-confirm dialog pattern) → extract to a shared component

Ask yourself: "If I needed to change this logic, how many files would I need to update?" If the answer is more than 1, it likely belongs in a shared location.

## Naming

Always prefix with `use`:

- `useRoundPermissions` — role/editability logic
- `useScoringResume` — localStorage persistence
- `useClipboard` — copy to clipboard
- `useConfirmDialog` — dialog state management

## SSR Safety

Always handle SSR in hooks that access browser APIs:

```typescript
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });
  // ...
}
```

---

# Validators Conventions

## Folder Structure

Split validators into domain-specific files:

```
src/lib/validators/
├── index.ts        # Re-export all
├── auth.ts         # Auth-related schemas
├── course.ts       # Course schemas
├── tournament.ts   # Tournament schemas
├── round.ts        # Round schemas
├── score.ts        # Score schemas
├── competition.ts  # Competition schemas
└── shared.ts       # Shared field schemas
```

## Shared Field Schemas

Extract reusable field definitions:

```typescript
// src/lib/validators/shared.ts
export const handicapField = z.coerce.number().min(-10).max(54);
export const dateField = z.string().datetime();
export const teeTimeField = z.string().regex(/^\d{2}:\d{2}$/);

// Use in domain validators:
export const TournamentSchema = z.object({
  name: z.string().min(1),
  date: dateField,
  handicap: handicapField.optional(),
});
```

---

# Domain Engine Conventions

## File Organization

Domain logic (pure scoring engines) lives in `src/lib/domain/`:

```
src/lib/domain/
├── index.ts              # Re-export with JSDoc
├── rank.ts               # Shared rank assignment
├── mappers.ts            # Data transformation utilities
├── stroke-play.ts
├── stableford.ts
├── match-play.ts
├── best-ball.ts
├── hi-lo.ts
├── rumble.ts
├── wolf.ts
├── six-point.ts
├── chair.ts
├── bonus.ts
├── standings.ts
├── individual-scoreboard.ts
└── tournament-leaderboard.ts
```

## Functional Style

Domain functions should be pure and immutable:

```typescript
// Good - no mutation
export function calculateStableford(
  holes: HoleScore[],
  config: StablefordConfig,
): StablefordResult {
  const total = holes.reduce((sum, h) => sum + h.points, 0);
  return { total, byHole: holes }; // New object
}

// Bad - mutation
export function calculateStableford(holes, config) {
  let total = 0;
  holes.forEach((h) => {
    h.points = computePoints(h, config); // MUTATION
    total += h.points;
  });
  return holes; // Mutated input
}
```

## JSDoc Requirements

Every exported function must have JSDoc:

```typescript
/**
 * Assigns ranks to participants based on their scores.
 * Handles ties by assigning the same rank and skipping subsequent ranks.
 *
 * @param participants - Array of participants with scores
 * @param getScore - Function to extract score from participant
 * @param options - Ranking options
 * @returns Map of participant ID to rank
 */
export function assignRanks<T>(
  participants: T[],
  getScore: (item: T) => number,
  options?: { descending?: boolean },
): Map<string, number> {
  // ...
}
```

## Options Objects

Prefer options objects over positional arguments for functions with 3+ parameters:

```typescript
// Good - options object
export function calculateMatch(
  scores: [number, number],
  names: [string, string],
  holes: HoleData[],
  options?: { format?: 'stroke' | 'stableford' },
): MatchResult;

// Bad - positional arguments
export function calculateMatch(
  p1Score: number,
  p2Score: number,
  p1Name: string,
  p2Name: string,
  hole1Par: number,
  // ... 6 more
): MatchResult;
```

---

# Query Options Conventions

## Centralized Query Options

All query option factories should live in `src/lib/query-options.ts`:

```typescript
// src/lib/query-options.ts
import { queryOptions } from '@tanstack/react-query';

export function roundQueryOptions(roundId: string) {
  return queryOptions({
    queryKey: ['rounds', roundId],
    queryFn: () => getRoundFn({ data: { roundId } }),
  });
}

export function competitionsQueryOptions(roundId: string) {
  return queryOptions({
    queryKey: ['competitions', roundId],
    queryFn: () => getCompetitionsFn({ data: { roundId } }),
  });
}
```

Routes and components should import from here, not define their own.

---

# Component Patterns

## Thin Routes

Routes should only:

- Parse search params
- Call loaders
- Render page components
- No markup, no styling, minimal logic

```typescript
// Good - thin route
export default function TournamentDetailPage() {
  const { tournamentId } = useParams({ from: '/tournaments/:tournamentId' });
  const { data: tournament } = useQuery(tournamentQueryOptions(tournamentId));

  if (!tournament) return <Loading />;

  return <TournamentDetail tournament={tournament} />;
}

// Bad - route has markup
export default function TournamentDetailPage() {
  // ... loader

  return (
    <div className="container">
      <h1 className="text-2xl font-bold">{tournament.name}</h1>
      {/* Hundreds of lines of markup */}
    </div>
  );
}
```

## Shared Components

Extract reusable components to `src/components/shared/`:

- `confirm-dialog/` — Delete/confirm dialogs
- `score-input/` — Score entry (stepper + grid)
- `competition-form-fields/` — Form field components
- `competition-results/` — Leaderboard components

## Dialog Components

Use consistent dialog patterns:

```typescript
interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>; // async for loading state
  title: string;
  description: string;
  itemName: string;
}
```

---

# Import Conventions

## Path Aliases

Use `@/` aliases consistently:

| Alias            | Maps to            |
| ---------------- | ------------------ |
| `@/`             | `src/`             |
| `@/components/*` | `src/components/*` |
| `@/lib/*`        | `src/lib/*`        |
| `@/hooks`        | `src/hooks`        |
| `@/types`        | `src/types`        |

## Relative vs Absolute

- **Relative** for co-located components (same feature folder)
- **Absolute** for shared utilities and UI components

```typescript
// Good - relative for co-located
import { TeamItem } from './components/team-item';

// Good - absolute for shared
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
```

---

# Testing Patterns

(TODO: Add testing conventions once test setup is complete)

---

# Configuration Conventions

## Config Location

All static configuration lives in `src/config/`:

```
src/config/
├── apple-splash.ts      # PWA splash screens
├── constants.ts         # App-wide constants
└── theme.ts             # Theme configuration
```

## Server Config

Server-only configuration lives in `src/lib/server/env.server.ts`:

```typescript
// src/lib/server/env.server.ts
export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  // ... all env vars with trimming and validation
} as const;

export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}
```

---

# Database Schema Conventions

## Schema Location

All database schema lives in `src/db/schema/`:

```
src/db/
├── schema/
│   ├── index.ts         # Re-export all tables
│   ├── users.ts         # User table
│   ├── tournaments.ts  # Tournament table
│   ├── rounds.ts        # Round table
│   ├── scores.ts        # Score table
│   ├── competitions.ts # Competition table
│   └── ...              # Other domain tables
└── index.ts             # Drizzle client export
```

## JSONB Columns

Use strict Zod schemas for JSONB column configs:

```typescript
// Good - strict schema with validation
export const competitions = pgTable('competitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  configJson: jsonb('config_json').$type<CompetitionConfig>().notNull(),
  // ...
});

// Use a validator for parsing
export type CompetitionConfig = z.infer<typeof CompetitionConfigSchema>;
export const CompetitionConfigSchema = z.discriminatedUnion('formatType', [
  StablefordConfigSchema,
  StrokeConfigSchema,
  // ...
]);

// Parse with: CompetitionConfigSchema.parse(row.configJson)
```

Avoid:

- `any` type on JSONB columns
- Casting with `as` without validation

## Enum Types

Use PostgreSQL enums where values are fixed:

```typescript
export const TournamentStatus = pgEnum('tournament_status', [
  'setup',
  'open',
  'in_progress',
  'locked',
  'completed',
]);

export const RoundStatus = pgEnum('round_status', [
  'pending',
  'in_progress',
  'completed',
]);
```
