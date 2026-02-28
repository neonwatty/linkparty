# Plan: Authenticated E2E Testing with Local Supabase

## Problem

The current E2E test suite has two modes, both with significant limitations:

1. **Mock mode** (CI default): Uses a `sb-mock-auth-token` cookie to bypass the auth wall. Tests run against a fake backend — no real database, no real auth, no realtime sync. Party creation returns ephemeral `mock-party-*` IDs. Multi-user tests that require cross-user sync are skipped.

2. **Live mode** (`SUPABASE_LIVE=true`): Used only in `multi-user-realtime.spec.ts`. Also uses the same fake auth cookie, which the middleware accepts when `CI=true`. Tests talk to real Supabase, but users aren't actually authenticated — they share a single anonymous fake session. This means RLS policies that depend on `auth.uid()` aren't exercised, and the tests don't validate the real auth flow.

3. **Production PoC** (`multi-user-production-poc.spec.ts`): Uses real email/password login against production. This proves the approach works, but targets production and requires manually-created test accounts.

**The gap**: No E2E tests run against a real (local) Supabase backend with properly authenticated users. The CI already starts a local Supabase instance, but tests bypass auth instead of using it.

### RLS Coverage Reality Check

An important architectural constraint: all write operations go through API routes (`/api/parties/create`, `/api/queue/items`, etc.) that use a **service role client**, which bypasses RLS entirely. This means authenticated E2E tests will validate the full auth + app flow end-to-end, but they will **not** automatically exercise RLS write policies.

To actually test RLS enforcement, this plan includes explicit **cross-user rejection tests** that verify ownership boundaries — e.g., Guest B cannot edit Guest A's note. These tests call API routes as different authenticated users and assert 403 responses, validating that the application-level auth checks (which sit in front of the service role client) are correct.

The SELECT-path RLS policies are also largely permissive (`OR auth.uid() IS NULL`), so read-path RLS is not a meaningful test target either. The value of authenticated tests is in validating: (a) the real auth flow, (b) middleware session handling, (c) multi-user realtime sync with distinct identities, and (d) application-level ownership enforcement.

## Goal

Enable E2E tests in CI to authenticate as real users against the local Supabase instance, so that:

- Auth flows (login, session cookies, middleware redirects) are tested end-to-end
- Application-level ownership enforcement is validated with cross-user rejection tests
- Multi-user realtime sync tests run with distinct authenticated users
- No production credentials or external services are needed

## Approach: Playwright `globalSetup` + Auth Fixtures

### How It Works

1. **Global Setup** (`e2e/global-setup.ts`): Registered via the `globalSetup` config key in `playwright.config.ts`. Runs once per Playwright invocation (once per shard in CI). Uses the Supabase Admin API (`SERVICE_ROLE_KEY` from local Supabase) to create two test users with pre-confirmed emails. Then logs in each user via a headless browser, waits for `AuthContext` to sync the display name, and saves the authenticated `storageState` (cookies + localStorage) to disk.

2. **Playwright Config** (`playwright.config.ts`): Register `globalSetup` and add a new `authenticated-chromium` project. Configure the project to use Playwright `@auth` tag filtering so authenticated tests can live alongside mock-mode tests in feature-organized files.

3. **Auth Fixtures** (`e2e/fixtures.ts`): Extend Playwright's `test` object with `hostPage`/`guestPage` fixtures. Each fixture loads the appropriate `storageState`. Fixtures **fail explicitly** when auth state files are missing — no silent fallback.

4. **Global Teardown** (`e2e/global-teardown.ts`): Cleans up parties created by test users. Required for local dev (prevents hitting the 5-active-party limit across runs). In CI the local Supabase is ephemeral, so teardown is a no-op safety net.

5. **Existing tests**: Remain unchanged. Mock mode tests continue to work with the fake auth cookie. New authenticated tests coexist alongside them.

## Implementation Plan

### Step 1: Create `e2e/global-setup.ts`

This script runs once per Playwright invocation (once per shard in CI, where each shard is an independent runner with its own local Supabase instance).

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const AUTH_DIR = 'e2e/.auth'

const TEST_USERS = {
  host: {
    email: 'host@test.linkparty.local',
    password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
    displayName: 'Test Host',
    storageStatePath: `${AUTH_DIR}/host.json`,
  },
  guest: {
    email: 'guest@test.linkparty.local',
    password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
    displayName: 'Test Guest',
    storageStatePath: `${AUTH_DIR}/guest.json`,
  },
}

async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  // Safety: only run against LOCAL Supabase — never production
  const isLocalSupabase =
    supabaseUrl?.startsWith('http://127.0.0.1:54321') || supabaseUrl?.startsWith('http://localhost:54321')

  if (!isLocalSupabase || !serviceRoleKey) {
    console.log('[global-setup] No local Supabase detected, skipping user creation')
    return
  }

  // Abort if URL looks like a production Supabase instance
  if (supabaseUrl.includes('supabase.co') || supabaseUrl.includes('supabase.in')) {
    throw new Error(
      `[global-setup] SAFETY: Refusing to run against production Supabase (${supabaseUrl}). ` +
        'Use local Supabase only (http://localhost:54321).',
    )
  }

  // Ensure auth state directory exists
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create test users via Admin API (idempotent)
  for (const [role, user] of Object.entries(TEST_USERS)) {
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
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
      baseURL: config.projects[0]?.use?.baseURL || 'http://localhost:3000',
    })
    const page = await context.newPage()

    await page.goto('/login')
    await page.getByPlaceholder('Email address').fill(user.email)
    await page.getByPlaceholder('Password').fill(user.password)
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Wait for redirect to home (authenticated)
    await page.waitForURL('/', { timeout: 30000 })

    // Wait for AuthContext to sync display name from user_metadata to localStorage.
    // This validates the real auth-triggered sync flow rather than bypassing it.
    await page.waitForFunction(
      (expectedName) => localStorage.getItem('link-party-display-name') === expectedName,
      user.displayName,
      { timeout: 10000 },
    )

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

- **Local-only guard**: Checks for `localhost:54321` URL pattern — refuses to run against `*.supabase.co`. This prevents accidental production contamination when `.env.local` points to production.
- **`fs.mkdirSync`**: Creates `e2e/.auth/` at runtime instead of relying on a committed `.gitkeep` file.
- **`email_confirm: true`**: Bypasses email verification — no mailbox needed.
- **Display name sync via `waitForFunction`**: Waits for `AuthContext` to sync `user_metadata.display_name` to `localStorage` naturally, rather than manually setting it. This validates the real sync path.
- **30s login timeout**: Generous for cold CI containers where Next.js hydration can be slow.
- **`.trim()` on env vars**: Consistent with the project's existing pattern for Supabase keys (see `lib/supabase.ts`).

### Step 2: Create `e2e/global-teardown.ts`

Cleans up test data for local dev. In CI, local Supabase is ephemeral so this is a safety net.

```typescript
// e2e/global-teardown.ts
import { createClient } from '@supabase/supabase-js'

async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  const isLocalSupabase =
    supabaseUrl?.startsWith('http://127.0.0.1:54321') || supabaseUrl?.startsWith('http://localhost:54321')

  if (!isLocalSupabase || !serviceRoleKey) return

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find test users by email
  for (const email of ['host@test.linkparty.local', 'guest@test.linkparty.local']) {
    const {
      data: { users },
    } = await supabase.auth.admin.listUsers()
    const testUser = users?.find((u) => u.email === email)
    if (!testUser) continue

    // Delete all parties created by this user's sessions
    const { data: members } = await supabase
      .from('party_members')
      .select('party_id')
      .eq('user_id', testUser.id)
      .eq('role', 'host')

    if (members?.length) {
      const partyIds = members.map((m) => m.party_id)
      await supabase.from('queue_items').delete().in('party_id', partyIds)
      await supabase.from('party_members').delete().in('party_id', partyIds)
      await supabase.from('parties').delete().in('id', partyIds)
    }
  }

  console.log('[global-teardown] Test data cleaned up')
}

export default globalTeardown
```

### Step 3: Create `e2e/fixtures.ts`

Custom Playwright fixtures for authenticated contexts.

```typescript
// e2e/fixtures.ts
import { test as base, type Page, type BrowserContext } from '@playwright/test'
import * as fs from 'fs'

const HOST_STATE = 'e2e/.auth/host.json'
const GUEST_STATE = 'e2e/.auth/guest.json'

/** Realtime assertions need generous timeouts in CI containers */
export const REALTIME_TIMEOUT = 15_000

type AuthFixtures = {
  hostPage: Page
  guestPage: Page
  hostContext: BrowserContext
  guestContext: BrowserContext
}

export const test = base.extend<AuthFixtures>({
  hostContext: async ({ browser }, use) => {
    if (!fs.existsSync(HOST_STATE)) {
      throw new Error(
        `Auth state file not found: ${HOST_STATE}. ` +
          'Run globalSetup first (requires local Supabase via `supabase start`).',
      )
    }
    const context = await browser.newContext({ storageState: HOST_STATE })
    await use(context)
    await context.close()
  },

  guestContext: async ({ browser }, use) => {
    if (!fs.existsSync(GUEST_STATE)) {
      throw new Error(
        `Auth state file not found: ${GUEST_STATE}. ` +
          'Run globalSetup first (requires local Supabase via `supabase start`).',
      )
    }
    const context = await browser.newContext({ storageState: GUEST_STATE })
    await use(context)
    await context.close()
  },

  hostPage: async ({ hostContext }, use) => {
    const page = await hostContext.newPage()
    await use(page)
    await page.close()
  },

  guestPage: async ({ guestContext }, use) => {
    const page = await guestContext.newPage()
    await use(page)
    await page.close()
  },
})

export { expect } from '@playwright/test'
```

**Key design decisions:**

- **Explicit errors**: Throws with a helpful message when auth state is missing, instead of silently creating unauthenticated contexts. This prevents confusing "element not found" failures that mask the real issue.
- **`REALTIME_TIMEOUT` export**: Standardized 15s timeout constant for all cross-user realtime assertions. Accounts for WebSocket handshake + subscription confirmation delays in CI containers.
- **Explicit `page.close()`**: Ensures WebSocket connections are torn down cleanly during fixture teardown.

### Step 4: Update `playwright.config.ts`

Use the `globalSetup` config key (not a setup project) and add an `authenticated-chromium` project.

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

  // Auth setup — runs once per Playwright invocation (once per shard in CI).
  // Only activates when NEXT_PUBLIC_SUPABASE_URL points to local Supabase.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { origin: 'http://localhost:3000' },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
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

    // --- Authenticated project ---
    // Uses storageState from globalSetup for single-user tests.
    // Multi-user tests use hostPage/guestPage fixtures from e2e/fixtures.ts
    // which load their own storageState — they should NOT use the project-level
    // storageState. Use `test.use({ storageState: undefined })` in multi-user
    // test files to prevent inheriting the project default.
    {
      name: 'authenticated-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/host.json',
      },
      grep: /@auth/,
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

- **`globalSetup` config key** (not a setup project): Simpler, runs after `webServer` starts, failures are reported as fatal errors before any tests run. No confusion with `testMatch` patterns.
- **`grep: /@auth/`** (not `testMatch: /\.auth\.spec\.ts$/`): Tests are organized by feature (one file per feature), not by auth mode. Use `@auth` tag on individual tests to mark them for the authenticated project. This avoids the confusing split of `create-party.spec.ts` + `create-party.auth.spec.ts`.
- **Project `storageState` + fixture interaction note**: Multi-user tests that use `hostPage`/`guestPage` from fixtures should override the project-level `storageState` with `test.use({ storageState: undefined })` to prevent creating a third (unwanted) default context.
- **`globalTeardown`**: Runs after all tests complete, cleans up test parties.

### Step 5: Add `.gitignore` entry for auth state files

```
# e2e auth state (generated by global-setup, never commit)
e2e/.auth/*.json
```

Use `e2e/.auth/*.json` (not `e2e/.auth/`) so that if we ever add non-JSON files to the directory, they can still be tracked. The directory itself is created at runtime by `fs.mkdirSync` in `global-setup.ts` — no `.gitkeep` needed.

### Step 6: Write authenticated E2E tests

New authenticated tests use the `@auth` tag and import from `e2e/fixtures.ts`. They can live in existing feature files or in new files — organized by feature, not by auth mode.

#### Example: `e2e/create-party.auth.spec.ts`

```typescript
import { test, expect, REALTIME_TIMEOUT } from './fixtures'

test.describe('Create Party (Authenticated) @auth', () => {
  test('authenticated user can create a party @auth', async ({ hostPage }) => {
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
import { test, expect, REALTIME_TIMEOUT } from './fixtures'

// Override project-level storageState — multi-user tests use fixture contexts
test.use({ storageState: undefined })

test.describe('Multi-User Realtime Sync (Authenticated) @auth', () => {
  test('host creates party, guest joins, both see 2 watching @auth', async ({ hostPage, guestPage }) => {
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

    // Wait for BOTH users to see each other — confirms realtime subscriptions are active.
    // This is the sync gate: do not assert on content-level events until both sides
    // confirm subscription is receiving events.
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: REALTIME_TIMEOUT })
    await expect(guestPage.getByText(/2 watching/)).toBeVisible({ timeout: REALTIME_TIMEOUT })
  })

  test('cross-user content sync — notes appear on both sides @auth', async ({ hostPage, guestPage }) => {
    // [setup: create + join party, wait for "2 watching" gate]

    // Host adds note
    await hostPage.locator('.fab').click()
    await hostPage.getByRole('button', { name: 'Write a note' }).click()
    await hostPage.getByPlaceholder('Share a thought, reminder, or message...').fill('Host note')
    await hostPage.getByRole('button', { name: 'Preview' }).click()
    await hostPage.getByRole('button', { name: 'Add to Queue' }).click()
    // Wait for modal to close — use DOM state, not a fixed sleep
    await expect(hostPage.getByRole('dialog', { name: /add content to queue/i })).toBeHidden({ timeout: 10000 })

    // Guest sees the note via realtime
    await expect(guestPage.getByText('Host note')).toBeVisible({ timeout: REALTIME_TIMEOUT })
  })
})
```

#### Example: `e2e/ownership-enforcement.auth.spec.ts` (Cross-User Rejection)

```typescript
import { test, expect, REALTIME_TIMEOUT } from './fixtures'

test.use({ storageState: undefined })

test.describe('Ownership Enforcement @auth', () => {
  test("guest cannot edit host's note via API @auth", async ({ hostPage, guestPage }) => {
    // [setup: create party, join as guest, host adds a note]

    // Guest attempts to edit host's note — should be rejected
    // This validates application-level ownership checks in the API route
    const response = await guestPage.request.patch('/api/queue/items/[itemId]', {
      data: { content: 'Hijacked!' },
    })
    expect(response.status()).toBe(403)
  })
})
```

### Step 7: Update CI workflow (`.github/workflows/ci.yml`)

The CI already starts local Supabase and exports `SERVICE_ROLE_KEY` to the E2E test environment. No env var changes are needed.

**Sharding behavior**: Each of the 3 CI shards runs on a separate GitHub Actions runner with its own local Supabase instance. `globalSetup` runs independently on each shard — user creation is idempotent (Admin API ignores "already exists"), and each shard writes `e2e/.auth/*.json` to its own local filesystem. Auth state files are **not shared** across shards, but this is correct: each shard has its own Supabase instance with its own user database.

**Realistic time overhead per shard**: ~25-35 seconds for the auth setup phase (browser launch + 2 login flows + cold page renders). This runs in parallel across shards, so net pipeline wall-time impact is one shard's overhead. The dominant cost remains the Next.js production build in each shard's `webServer` command.

### Step 8: Migrate `multi-user-realtime.spec.ts`

This is the **primary migration target** — a 532-line file with 10 workflows that most directly benefits from real auth. The existing file uses `SUPABASE_LIVE=true` as a gate and injects the fake auth cookie even when talking to a real backend, which is an inconsistent state (no real JWT, but real database).

**Migration approach:**

1. Create `multi-user-realtime.auth.spec.ts` using the `hostPage`/`guestPage` fixtures
2. Port all 10 workflows, replacing `waitForTimeout(1000)` with `expect(dialog).toBeHidden()` (the correct pattern already exists in `queue-operations.spec.ts`)
3. Keep the original file for mock-mode UI validation, but remove the `SUPABASE_LIVE` gate — it becomes a purely mock-mode test
4. Standardize all realtime assertions to use the exported `REALTIME_TIMEOUT` (15s)

### Step 9: Translate browser-workflows.md to authenticated E2E tests

Once the auth infrastructure is in place, translate workflows from `workflows/browser-workflows.md`:

| Priority | Workflow # | Name                     | Why                                                                  |
| -------- | ---------- | ------------------------ | -------------------------------------------------------------------- |
| High     | 9          | Add Simple Note          | Core feature, validates queue write + realtime sync                  |
| High     | 10         | Add Note with Due Date   | Due date field exercised                                             |
| High     | 11         | Mark Note Complete       | Completion toggle                                                    |
| High     | —          | Cross-user rejection     | New: validates ownership enforcement (see example above)             |
| Medium   | 12         | View and Edit Note       | Edit flow                                                            |
| Medium   | 15         | Reorder Queue Items      | @dnd-kit (may need keyboard-based reorder)                           |
| Medium   | 16         | Show Item Next           | Queue advance                                                        |
| Medium   | 17         | Remove Queue Item        | Delete                                                               |
| Medium   | 34         | Password-Protected Party | Password validation                                                  |
| Low      | 6          | Add YouTube Content      | Requires edge runtime (excluded in CI with `--exclude edge-runtime`) |
| Low      | 13-14      | Image Content + Lightbox | Needs image upload infra                                             |
| Low      | 7-8        | Tweet/Reddit Content     | External URL metadata                                                |

**Note**: YouTube content (Workflow 6) was demoted from High to Low because the CI starts Supabase with `--exclude edge-runtime`, which means the `fetch-content-metadata` edge function returns 404. Either remove the `--exclude edge-runtime` flag (increases CI startup time) or defer this workflow until edge runtime is included.

## File Changes Summary

| File                       | Action        | Description                                                                    |
| -------------------------- | ------------- | ------------------------------------------------------------------------------ |
| `e2e/global-setup.ts`      | **Create**    | Admin API user creation + browser login + storageState save (local-only guard) |
| `e2e/global-teardown.ts`   | **Create**    | Cleanup test parties (required for local dev, safety net for CI)               |
| `e2e/fixtures.ts`          | **Create**    | Custom Playwright fixtures with `hostPage` / `guestPage` + `REALTIME_TIMEOUT`  |
| `.gitignore`               | **Edit**      | Add `e2e/.auth/*.json`                                                         |
| `playwright.config.ts`     | **Edit**      | Add `globalSetup`, `globalTeardown`, and `authenticated-chromium` project      |
| `e2e/*.auth.spec.ts`       | **Create**    | New authenticated test files (tagged `@auth`)                                  |
| `.github/workflows/ci.yml` | **No change** | Already exports `SERVICE_ROLE_KEY`                                             |

## Migration Strategy

- **No breaking changes**: All existing mock-mode tests continue to work unchanged
- **Tag-based organization**: Authenticated tests use `@auth` tags, keeping feature files cohesive. No `*.auth.spec.ts` suffix required (though it can be used for purely-authenticated files like multi-user sync)
- **Primary migration target**: `multi-user-realtime.spec.ts` (10 workflows, 532 lines) — convert to authenticated fixtures
- **Gradual expansion**: Other mock-mode tests can add `@auth`-tagged variants alongside existing tests
- **Sharding-safe**: Each shard runs `globalSetup` independently against its own local Supabase instance

## Risks and Mitigations

| Risk                               | Mitigation                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global setup adds CI time          | ~25-35s per shard for auth setup (browser launch + 2 login flows). Runs in parallel across shards. Small fraction of total pipeline time.                                     |
| Flaky auth in CI                   | Supabase is local (no network latency). `email_confirm: true` eliminates async email flow. 30s login timeout for cold containers.                                             |
| Realtime subscription timing       | Standardized 15s `REALTIME_TIMEOUT`. "2 watching" gate confirms both subscriptions are active before content assertions. No fixed sleeps — use `expect(dialog).toBeHidden()`. |
| Test isolation                     | Each test gets a fresh `BrowserContext`. `globalTeardown` cleans up parties. Local Supabase is ephemeral per CI run.                                                          |
| Sharding + global setup            | Each shard is an independent runner with its own Supabase. `globalSetup` runs per-shard. User creation is idempotent. Auth state files are per-runner (not shared).           |
| Local dev without Supabase         | `globalSetup` skips silently when no local Supabase is detected. Fixtures throw explicit errors if auth state files are missing.                                              |
| Production contamination           | Local-only guard: refuses to run unless URL is `localhost:54321`. Explicit abort if URL contains `supabase.co`.                                                               |
| Login selector brittleness         | `globalSetup` failures are fatal — entire shard fails immediately with a clear error. Selectors match existing login page markup.                                             |
| storageState + project config      | Multi-user tests override project `storageState` with `test.use({ storageState: undefined })` to prevent creating unwanted default contexts.                                  |
| Party limit on repeated local runs | `globalTeardown` deletes test parties after each run. Prevents hitting the 5-active-party limit.                                                                              |

## Decisions Made (Previously Open Questions)

1. **Fake auth cookie bypass in middleware**: Keep for now. The `CI`-gated bypass (middleware lines 40-45) is not active in production (Vercel runtime does not set `CI=true`). Removing it would break all 20+ existing mock-mode spec files simultaneously. Once the authenticated test suite has sufficient coverage, remove the bypass in a dedicated follow-up PR. The `@auth`-tagged tests do NOT use the fake cookie — they use real Supabase session cookies — so a migration path exists.

2. **`multi-user-realtime.spec.ts` migration**: Required (not optional). This is the primary migration target. See Step 8 above.

3. **Test data cleanup**: Required via `globalTeardown`. Prevents 5-active-party limit failures on repeated local dev runs. Uses Admin API to delete parties by test user ID.

## Local Development Setup

To run authenticated tests locally:

1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Start local Supabase: `supabase start` (first run pulls Docker images, takes 2-5 min)
3. Note the local credentials printed by `supabase start` (API URL, anon key, service role key)
4. Create a `.env.local.supabase` file (or override `.env.local`) with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key from supabase start>
   SUPABASE_SERVICE_ROLE_KEY=<local service role key from supabase start>
   ```
5. Run tests: `npx playwright test --project=authenticated-chromium`

**Recovery**: If tests fail with auth errors after restarting local Supabase, delete `e2e/.auth/*.json` and re-run — `globalSetup` will re-create users and re-authenticate.

**Important**: Do NOT run authenticated tests with `.env.local` pointing to production Supabase. The `globalSetup` guard will abort with an explicit error if the URL contains `supabase.co`.
