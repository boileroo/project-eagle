# Test Infrastructure: Playwright

## What

Install and configure Playwright as the E2E test runner.

## Context

E2E tests will drive a real browser against the running dev server, exercising the full stack (UI → server functions → database). Playwright is the right tool: it has excellent TypeScript support, handles TanStack Start's SSR hydration well, and has a solid test isolation model.

**Steps:**

1. Install `@playwright/test` as a dev dependency
2. Run `npx playwright install chromium` (Chromium only is sufficient to start)
3. Create `playwright.config.ts` at the project root with:
   - `baseURL: 'http://localhost:3000'`
   - `testDir: './e2e'`
   - `use: { trace: 'on-first-retry', screenshot: 'only-on-failure' }`
   - A `webServer` block that starts `vite` and waits for port 3000
   - `storageState` path for saved auth sessions (see `test-infra-e2e-helpers`)
4. Create the `e2e/` directory at the project root
5. Add `"test:e2e": "playwright test"` and `"test:e2e:ui": "playwright test --ui"` to `package.json` scripts
6. Add `e2e/` and `playwright-report/` to `.gitignore`
7. Create a minimal `e2e/smoke.spec.ts` that navigates to `/login` and asserts the page title loads — just to confirm the setup works
8. Verify `yarn test:e2e` runs and passes

## Done When

- `yarn test:e2e` runs Playwright and exits 0
- The smoke test navigates to the login page successfully
- `playwright-report/` is gitignored
- `playwright.config.ts` is committed and correctly configured
