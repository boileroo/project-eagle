# Test Infrastructure: Vitest

## What

Install and configure Vitest as the unit test runner for the project.

## Context

The project currently has no test framework. Vitest is the natural choice — it shares the same Vite config and works natively with TypeScript without any additional transformation setup.

Unit tests will live alongside source files under `src/`, using the convention `*.test.ts`. The initial target is the pure domain engine functions in `src/lib/domain/`, but the setup should support testing any module in `src/lib/`.

**Steps:**

1. Install `vitest` and `@vitest/coverage-v8` as dev dependencies
2. Add a `test` block to `vite.config.ts` (or a separate `vitest.config.ts`) with:
   - `environment: 'node'` (domain logic is pure JS, no DOM needed)
   - `include: ['src/**/*.test.ts']`
   - `coverage` config pointing to `src/lib/domain/`
3. Add `"test": "vitest"` and `"test:coverage": "vitest --coverage"` to `package.json` scripts
4. Add `"test:watch": "vitest --watch"` for development
5. Write a single smoke-test file (`src/lib/domain/stableford.test.ts`) with one passing test to confirm the setup works end-to-end
6. Verify `yarn test` runs and passes

## Done When

- `yarn test` runs Vitest and exits 0
- `yarn test:coverage` produces a coverage report
- A minimal smoke-test file exists and passes
- `tsconfig.json` resolves `@/` paths correctly within test files
