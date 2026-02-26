import { test, expect, type BrowserContext, type Page } from '@playwright/test'

/**
 * Multi-User Production PoC
 *
 * Validates that Playwright browser contexts provide true session isolation
 * for testing multi-user workflows against production (linkparty.app).
 *
 * Prerequisites:
 *   1. Create two test accounts on https://linkparty.app/signup
 *   2. Run with credentials:
 *      HOST_EMAIL=<email1> HOST_PASSWORD=<pass1> \
 *      GUEST_EMAIL=<email2> GUEST_PASSWORD=<pass2> \
 *      npx playwright test e2e/multi-user-production-poc.spec.ts --project=chromium
 */

// --- Credentials from env ---
const HOST_EMAIL = process.env.HOST_EMAIL || ''
const HOST_PASSWORD = process.env.HOST_PASSWORD || ''
const GUEST_EMAIL = process.env.GUEST_EMAIL || ''
const GUEST_PASSWORD = process.env.GUEST_PASSWORD || ''

const hasCredentials = HOST_EMAIL && HOST_PASSWORD && GUEST_EMAIL && GUEST_PASSWORD

// Override base URL to production for this file only
test.use({
  baseURL: 'https://linkparty.app',
  extraHTTPHeaders: {}, // Clear the localhost origin header from global config
})

// Longer timeouts for production network latency + Supabase Realtime propagation
test.setTimeout(60_000)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Hide the "You're offline" banner — it's a fixed overlay that intercepts pointer events */
async function dismissOfflineBanner(page: Page): Promise<void> {
  await page.evaluate(() => {
    const banner = document.querySelector('.fixed.top-0.bg-amber-500')
    if (banner) (banner as HTMLElement).style.display = 'none'
  })
}

async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByPlaceholder('Email address').fill(email)
  await page.getByPlaceholder('Password').fill(password)

  // Click sign in and wait for the auth token response
  const [authResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('token?grant_type=password'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ])
  expect(authResponse.status()).toBe(200)

  // createBrowserClient stores session in cookies automatically — wait for navigation
  await page.waitForURL('/', { timeout: 15000 })

  // Confirm we're on the authenticated home page
  await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 15000 })

  await dismissOfflineBanner(page)
}

async function createPartyAsHost(page: Page): Promise<string> {
  await page.getByRole('link', { name: 'Start a Party' }).first().click()
  await page.getByRole('button', { name: 'Create Party' }).click()

  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 15000 })
  await dismissOfflineBanner(page)
  const codeText = (await page.getByTestId('party-code').textContent())?.trim() || ''
  return codeText
}

async function joinPartyAsGuest(page: Page, partyCode: string): Promise<void> {
  await page.getByRole('link', { name: 'Join with Code' }).click()
  await page.getByPlaceholder('ABC123').fill(partyCode)
  await page.getByRole('button', { name: 'Join Party' }).click()

  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 15000 })
  await dismissOfflineBanner(page)
}

async function addNote(page: Page, text: string): Promise<void> {
  await page.locator('.fab').click()
  await page.getByRole('button', { name: 'Write a note' }).click()
  await page.getByPlaceholder('Share a thought, reminder, or message...').fill(text)
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Add to Queue' }).click()
  await page.waitForTimeout(1000)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Multi-User Production PoC', () => {
  test.skip(!hasCredentials, 'Requires HOST_EMAIL, HOST_PASSWORD, GUEST_EMAIL, GUEST_PASSWORD env vars')

  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    // Two completely isolated browser contexts — separate cookies, localStorage, sessions
    hostContext = await browser.newContext()
    guestContext = await browser.newContext()
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Test 1: Session isolation — two contexts have independent auth states', async () => {
    // Log in both users
    await loginAsUser(hostPage, HOST_EMAIL, HOST_PASSWORD)
    await loginAsUser(guestPage, GUEST_EMAIL, GUEST_PASSWORD)

    // Extract session IDs from localStorage — each context should have its own
    const hostSessionId = await hostPage.evaluate(() => localStorage.getItem('link-party-session-id'))
    const guestSessionId = await guestPage.evaluate(() => localStorage.getItem('link-party-session-id'))

    // Session IDs should be different (or both null if not yet set — that's also fine,
    // the point is they're independent). If both exist, they must differ.
    if (hostSessionId && guestSessionId) {
      expect(hostSessionId).not.toBe(guestSessionId)
    }

    // Verify cookies are isolated — set a test value in one context, absent in other
    await hostPage.evaluate(() => localStorage.setItem('poc-test', 'host-only'))
    const guestSees = await guestPage.evaluate(() => localStorage.getItem('poc-test'))
    expect(guestSees).toBeNull()
  })

  test('Test 2: Create and join party — host creates, guest joins with code', async () => {
    // Log in both users
    await loginAsUser(hostPage, HOST_EMAIL, HOST_PASSWORD)
    await loginAsUser(guestPage, GUEST_EMAIL, GUEST_PASSWORD)

    // Host creates a party
    const partyCode = await createPartyAsHost(hostPage)
    expect(partyCode).toMatch(/^[A-Z0-9]{6}$/)

    // Guest joins with the party code
    await joinPartyAsGuest(guestPage, partyCode)

    // Both should see the same party code
    await expect(hostPage.getByTestId('party-code')).toHaveText(partyCode)
    const guestCode = (await guestPage.getByTestId('party-code').textContent())?.trim()
    expect(guestCode).toBe(partyCode)

    // Both should see party room UI elements
    await expect(hostPage.getByRole('button', { name: /leave party/i })).toBeVisible()
    await expect(guestPage.getByRole('button', { name: /leave party/i })).toBeVisible()
  })

  test('Test 3: Real-time member count — guest join updates host to 2 watching', async () => {
    await loginAsUser(hostPage, HOST_EMAIL, HOST_PASSWORD)
    await loginAsUser(guestPage, GUEST_EMAIL, GUEST_PASSWORD)

    const partyCode = await createPartyAsHost(hostPage)

    // Host should initially see 1 watching
    await expect(hostPage.getByText(/1 watching/)).toBeVisible({ timeout: 10000 })

    // Guest joins
    await joinPartyAsGuest(guestPage, partyCode)

    // Both should see 2 watching via Supabase Realtime
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })
    await expect(guestPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })
  })

  test('Test 4: Cross-user content sync — notes appear on both sides via Realtime', async () => {
    await loginAsUser(hostPage, HOST_EMAIL, HOST_PASSWORD)
    await loginAsUser(guestPage, GUEST_EMAIL, GUEST_PASSWORD)

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, partyCode)

    // Wait for both to see each other
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })

    // Host adds a note
    await addNote(hostPage, 'Hello from Host')

    // Guest should see the note via Realtime
    await expect(guestPage.getByText('Hello from Host')).toBeVisible({ timeout: 15000 })

    // Guest adds a note
    await addNote(guestPage, 'Hello from Guest')

    // Host should see the note via Realtime
    await expect(hostPage.getByText('Hello from Guest')).toBeVisible({ timeout: 15000 })
  })

  test('Test 5: Guest leaves — member count drops back to 1 watching', async () => {
    await loginAsUser(hostPage, HOST_EMAIL, HOST_PASSWORD)
    await loginAsUser(guestPage, GUEST_EMAIL, GUEST_PASSWORD)

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, partyCode)

    // Both see 2 watching
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })

    // Guest leaves
    await guestPage.getByRole('button', { name: /leave party/i }).click()

    // Guest should be back on home page
    await expect(guestPage.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 10000 })

    // Host should see count drop to 1 watching via Realtime
    await expect(hostPage.getByText(/1 watching/)).toBeVisible({ timeout: 10000 })
  })
})
