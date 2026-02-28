# Plan: Authenticated E2E Testing with Local Supabase

## Problem

The current E2E test suite has two modes, both with significant limitations:

1. **Mock mode** (CI default): Uses a `sb-mock-auth-token` cookie to bypass the auth wall. Tests run against a fake backend — no real database, no real auth, no realtime sync. Party creation returns ephemeral `mock-party-*` IDs. Multi-user tests that require cross-user sync are skipped.

2. **Live mode** (`SUPABASE_LIVE=true`): Also uses the same fake auth cookie, which the middleware accepts when `CI=true`. Tests talk to real Supabase, but users aren't actually authenticated — they share a single anonymous fake session. This means RLS policies that depend on `auth.uid()` aren't exercised, and the tests don't validate the real auth flow.

3. **Production PoC** (`multi-user-production-poc.spec.ts`): Uses real email/password login against production. This proves the approach works, but targets production and requires manually-created test accounts.

**The gap**: No E2E tests run against a real (local) Supabase backend with properly authenticated users. The CI already starts a local Supabase instance, but tests bypass auth instead of using it.

## Goal

Enable E2E tests in CI to authenticate as real users against the local Supabase instance, so that:

- Auth flows (login, session cookies, middleware redirects) are tested end-to-end
- RLS policies are exercised with real `auth.uid()` values
- Multi-user realtime sync tests run with distinct authenticated users
- No production credentials or external services are needed

## Approach: Playwright Global Setup + Auth Fixtures

### How It Works

1. **Global Setup** (`e2e/global-setup.ts`): Runs once before all tests. Uses the Supabase Admin API (`SERVICE_ROLE_KEY` from local Supabase) to create two test users with pre-confirmed emails. Then logs in each user via a headless browser, saves the authenticated `storageState` (cookies + localStorage) to disk.

2. **Playwright Config** (`playwright.config.ts`): Add a `setup` project that runs `global-setup.ts`. Configure dependent projects to use the saved `storageState` so every test starts already authenticated — no login flow needed per test.

3. **Auth Fixtures** (`e2e/fixtures.ts`): Extend Playwright's `test` object with a custom `authenticatedPage` fixture (and `hostPage`/`guestPage` for multi-user). Each fixture loads the appropriate `storageState`.

4. **Existing tests**: Remain unchanged. Mock mode tests continue to work with the fake auth cookie. New authenticated tests coexist alongside them.

## Implementation Plan

### Step 1: Create `e2e/global-setup.ts`

This script runs once before the test suite in CI (where local Supabase is available).

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TEST_USERS = {
  host: {
    email: 'host@test.linkparty.local',
    password: 'TestPassword123!',
    displayName: 'Test Host',
    storageStatePath: 'e2e/.auth/host.json',
  },
  guest: {
    email: 'guest@test.linkparty.local',
    password: 'TestPassword123!',
    displayName: 'Test Guest',
    storageStatePath: 'e2e/.auth/guest.json',
  },
}

async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Only run when local Supabase is available (CI or local dev with supabase start)
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    console.log('[global-setup] No local Supabase detected, skipping user creation')
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create test users via Admin API (idempotent — ignores "already exists" errors)
  for (const [role, user] of Object.entries(TEST_USERS)) {
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Skip email verification
      user_metadata: { display_name: user.displayName },
    })
    if (error && !error.message.includes('already been registered')) {
      throw new Error(`Failed to create ${role} user: ${error.message}`)
    }
  }

  // Log in each user via browser and save storageState
  const browser = await chromium.launch()

  for (const [role, user] of Object.entries(TEST_USERS)) {
    const context = await browser.newContext({
      baseURL: config.projects[0].use.baseURL || 'http://localhost:3000',
    })
    const page = await context.newPage()

    await page.goto('/login')
    await page.getByPlaceholder('Email address').fill(user.email)
    await page.getByPlaceholder('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for redirect to home (authenticated)
    await page.waitForURL('/', { timeout: 15000 })

    // Set display name in localStorage
    await page.evaluate((name) => {
      localStorage.setItem('link-party-display-name', name)
    }, user.displayName)

    // Save cookies + localStorage
    await context.storageState({ path: user.storageStatePath })
    await context.close()

    console.log(`[global-setup] ${role} user authenticated, state saved`)
  }

  await browser.close()
}

export default globalSetup
```

**Key design decisions:**

- `email_confirm: true` bypasses email verification — no mailbox needed
- `storageState` saves both cookies AND localStorage, so display names persist
- Idempotent: if users already exist (e.g., retried CI run), creation is a no-op
- Only activates when `SUPABASE_SERVICE_ROLE_KEY` is set (CI with local Supabase)

### Step 2: Create `e2e/fixtures.ts`

Custom Playwright fixtures for authenticated contexts.

```typescript
// e2e/fixtures.ts
import { test as base, type Page, type BrowserContext } from '@playwright/test'
import * as fs from 'fs'

const HOST_STATE = 'e2e/.auth/host.json'
const GUEST_STATE = 'e2e/.auth/guest.json'

// Check if authenticated storage states exist (created by global-setup)
const hasAuthState = () => fs.existsSync(HOST_STATE) && fs.existsSync(GUEST_STATE)

type AuthFixtures = {
  hostPage: Page
  guestPage: Page
  hostContext: BrowserContext
  guestContext: BrowserContext
}

export const test = base.extend<AuthFixtures>({
  hostContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: hasAuthState() ? HOST_STATE : undefined,
    })
    await use(context)
    await context.close()
  },

  guestContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: hasAuthState() ? GUEST_STATE : undefined,
    })
    await use(context)
    await context.close()
  },

  hostPage: async ({ hostContext }, use) => {
    const page = await hostContext.newPage()
    await use(page)
  },

  guestPage: async ({ guestContext }, use) => {
    const page = await guestContext.newPage()
    await use(page)
  },
})

export { expect } from '@playwright/test'
```

**Key design decisions:**

- Falls back gracefully when auth state files don't exist (mock mode still works)
- Each user gets an independent `BrowserContext` with their own cookies/localStorage
- Fixtures compose naturally with Playwright's test runner

### Step 3: Update `playwright.config.ts`

Add a `setup` project and a new `authenticated` project.

```typescript
// Changes to playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  timeout: process.env.CI ? 60_000 : 30_000,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { origin: 'http://localhost:3000' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // --- Setup project: creates test users & saves auth state ---
    {
      name: 'setup',
      testMatch: /global-setup\.ts/, // or use globalSetup in config
    },

    // --- Existing projects (unchanged) ---
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        ...(process.env.CI ? { navigationTimeout: 45_000, actionTimeout: 15_000 } : {}),
      },
    },

    // --- New: Authenticated projects (depend on setup) ---
    {
      name: 'authenticated-chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/host.json',
      },
      testMatch: /\.auth\.spec\.ts$/, // Only run *.auth.spec.ts files
    },
  ],

  webServer: {
    command: process.env.CI ? 'npm run build && npm start' : 'npm run dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

**Key design decisions:**

- `globalSetup` (function-based) vs `setup` project: I recommend the `globalSetup` config option (simpler, runs once regardless of sharding). The `setup` project approach shown above is an alternative if we need browser-level setup visible in test reports.
- Authenticated tests use a separate file pattern (`*.auth.spec.ts`) so they don't interfere with existing mock-mode tests.
- The `storageState` in the project config applies to single-user tests. Multi-user tests use the custom fixtures from `e2e/fixtures.ts` instead.

### Step 4: Add `.gitignore` entry for auth state files

```
# e2e auth state (generated by global-setup, never commit)
e2e/.auth/
```

### Step 5: Write authenticated E2E tests

New test files use the `*.auth.spec.ts` naming convention and import from `e2e/fixtures.ts`.

#### Example: `e2e/create-party.auth.spec.ts`

```typescript
import { test, expect } from './fixtures'

test.describe('Create Party (Authenticated)', () => {
  test('authenticated user can create a party', async ({ hostPage }) => {
    await hostPage.goto('/')
    await hostPage.getByRole('link', { name: 'Start a Party' }).first().click()
    await hostPage.getByRole('button', { name: 'Create Party' }).click()

    // Real Supabase creates a real party with a real code
    await expect(hostPage.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    const code = await hostPage.getByTestId('party-code').textContent()
    expect(code?.trim()).toMatch(/^[A-Z0-9]{6}$/)
  })
})
```

#### Example: `e2e/multi-user-sync.auth.spec.ts`

```typescript
import { test, expect } from './fixtures'

test.describe('Multi-User Realtime Sync (Authenticated)', () => {
  test('host creates party, guest joins, both see 2 watching', async ({ hostPage, guestPage }) => {
    // Host creates party
    await hostPage.goto('/')
    await hostPage.getByRole('link', { name: 'Start a Party' }).first().click()
    await hostPage.getByRole('button', { name: 'Create Party' }).click()
    await expect(hostPage.getByTestId('party-code')).toBeVisible({ timeout: 10000 })

    const partyCode = (await hostPage.getByTestId('party-code').textContent())?.trim() || ''

    // Guest joins with the real party code
    await guestPage.goto('/')
    await guestPage.getByRole('link', { name: 'Join with Code' }).click()
    await guestPage.getByPlaceholder('ABC123').fill(partyCode)
    await guestPage.getByRole('button', { name: 'Join Party' }).click()
    await expect(guestPage.getByTestId('party-code')).toBeVisible({ timeout: 10000 })

    // Both should see 2 watching via Supabase Realtime
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })
    await expect(guestPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })
  })

  test('cross-user content sync — notes appear on both sides', async ({ hostPage, guestPage }) => {
    // [setup: create + join party]
    // Host adds note → Guest sees it via realtime
    // Guest adds note → Host sees it via realtime
  })
})
```

### Step 6: Update CI workflow (`.github/workflows/ci.yml`)

The CI already starts local Supabase and exports `SERVICE_ROLE_KEY`. The only change needed:

```yaml
# In the e2e job, add SERVICE_ROLE_KEY to the env
- name: Run E2E tests (shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }})
  run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ env.API_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ env.ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ env.SERVICE_ROLE_KEY }} # Already present!
```

This is already in place — no CI changes needed for the env vars. However, we need to ensure `globalSetup` runs before sharded tests. Playwright's `globalSetup` runs once per shard by default, which is fine — creating already-existing users is idempotent.

### Step 7: Translate browser-workflows.md to authenticated E2E tests

Once the auth infrastructure is in place, translate the remaining untested workflows from `workflows/browser-workflows.md`:

| Priority | Workflow # | Name                     | Why                                                  |
| -------- | ---------- | ------------------------ | ---------------------------------------------------- |
| High     | 6          | Add YouTube Content      | Core feature, needs real Supabase for metadata fetch |
| High     | 9          | Add Simple Note          | Core feature, validates queue_items RLS              |
| High     | 10         | Add Note with Due Date   | Due date field exercised                             |
| High     | 11         | Mark Note Complete       | Completion toggle with RLS                           |
| Medium   | 12         | View and Edit Note       | Edit flow                                            |
| Medium   | 15         | Reorder Queue Items      | @dnd-kit (may need keyboard-based reorder)           |
| Medium   | 16         | Show Item Next           | Queue advance                                        |
| Medium   | 17         | Remove Queue Item        | Delete with RLS                                      |
| Medium   | 34         | Password-Protected Party | Password validation                                  |
| Low      | 13-14      | Image Content + Lightbox | Needs image upload infra                             |
| Low      | 7-8        | Tweet/Reddit Content     | External URL metadata                                |

## File Changes Summary

| File                       | Action        | Description                                                 |
| -------------------------- | ------------- | ----------------------------------------------------------- |
| `e2e/global-setup.ts`      | **Create**    | Admin API user creation + browser login + storageState save |
| `e2e/fixtures.ts`          | **Create**    | Custom Playwright fixtures with `hostPage` / `guestPage`    |
| `e2e/.auth/.gitkeep`       | **Create**    | Ensure directory exists in git                              |
| `.gitignore`               | **Edit**      | Add `e2e/.auth/*.json`                                      |
| `playwright.config.ts`     | **Edit**      | Add `globalSetup` and authenticated project                 |
| `e2e/*.auth.spec.ts`       | **Create**    | New authenticated test files                                |
| `.github/workflows/ci.yml` | **No change** | Already exports `SERVICE_ROLE_KEY`                          |

## Migration Strategy

- **No breaking changes**: All existing mock-mode tests continue to work unchanged
- **Incremental adoption**: New authenticated tests use the `*.auth.spec.ts` convention
- **Gradual replacement**: Over time, mock-mode tests for features that benefit from real auth can be migrated to `*.auth.spec.ts`
- **Sharding-safe**: `globalSetup` is idempotent — safe to run in each shard

## Risks and Mitigations

| Risk                       | Mitigation                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Global setup adds CI time  | User creation via Admin API is <1s. Browser login is ~3s per user. Total: ~7s overhead.                       |
| Flaky auth in CI           | Supabase is local (no network latency). `email_confirm: true` eliminates async email flow.                    |
| Test isolation             | Each test gets a fresh `BrowserContext`. Party cleanup isn't needed — local Supabase is ephemeral per CI run. |
| Sharding + global setup    | Playwright's `globalSetup` runs per shard, but `createUser` with `email_confirm: true` is idempotent.         |
| Local dev without Supabase | `hasAuthState()` check falls back gracefully — mock-mode tests still work.                                    |

## Open Questions

1. **Should we remove the `CI` env check for fake auth cookies in middleware?** Once authenticated tests are working, the `mock-auth-token` bypass in middleware (lines 40-45) could be narrowed or removed. This is a security improvement but would break existing mock-mode tests — so it should be a follow-up.

2. **Should `multi-user-realtime.spec.ts` be converted to use fixtures?** The existing file uses `SUPABASE_LIVE=true` as a gate. We could migrate it to `multi-user-realtime.auth.spec.ts` and remove the manual skip logic.

3. **Test data cleanup between tests?** Since local Supabase is ephemeral (destroyed after CI), cleanup isn't strictly necessary. But for local dev, we might want a `globalTeardown` that deletes test parties.
