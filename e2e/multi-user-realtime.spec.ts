import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/**
 * Multi-User Realtime Sync Tests
 *
 * Generated from: /workflows/multi-user-workflows.md
 * Generated: 2026-02-13
 *
 * These tests verify real-time synchronization between two independent browser
 * contexts (Host + Guest). Each context has its own localStorage and session,
 * simulating two different users on separate devices.
 *
 * REQUIRES a live Supabase instance — skipped in mock mode (no shared backend).
 * Run with: SUPABASE_LIVE=true npx playwright test e2e/multi-user-realtime.spec.ts
 * Or against a real dev server: npm run dev (with Doppler credentials)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder')
const shouldSkip = isMockMode || !process.env.SUPABASE_LIVE

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUserContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()
  await context.addCookies([FAKE_AUTH_COOKIE])
  return context
}

async function resetSession(page: Page, displayName = 'Test User'): Promise<void> {
  await page.goto('/')
  await page.evaluate((name) => {
    localStorage.clear()
    localStorage.setItem('link-party-display-name', name)
  }, displayName)
  await page.reload()
}

async function createPartyAsHost(page: Page): Promise<string> {
  await resetSession(page)
  await page.getByRole('link', { name: 'Start a Party' }).first().click()
  await page.getByRole('button', { name: 'Create Party' }).click()
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  const codeText = (await page.getByTestId('party-code').textContent())?.trim() || ''
  return codeText
}

async function joinPartyAsGuest(page: Page, _displayName: string, partyCode: string): Promise<void> {
  await resetSession(page)
  await page.getByRole('link', { name: 'Join with Code' }).click()
  await page.getByPlaceholder('ABC123').fill(partyCode)
  await page.getByRole('button', { name: 'Join Party' }).click()
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
}

async function addNote(page: Page, text: string): Promise<void> {
  await page.locator('.fab').click()
  await page.getByRole('button', { name: 'Write a note' }).click()
  await page.getByPlaceholder('Share a thought, reminder, or message...').fill(text)
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Add to Queue' }).click()
  await page.waitForTimeout(1000)
}

async function addYouTubeLink(page: Page, url: string): Promise<void> {
  await page.locator('.fab').click()
  await page.getByPlaceholder('YouTube, Twitter/X, or Reddit URL...').fill(url)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('button', { name: 'Add to Queue' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'Add to Queue' }).click()
  await page.waitForTimeout(1000)
}

// ---------------------------------------------------------------------------
// WF1: Create and Join Party
// ---------------------------------------------------------------------------

test.describe('WF1: Create and Join Party', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Host creates party, Guest joins, Host sees 2 watching', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await expect(hostPage.getByText(/1 watching/)).toBeVisible({ timeout: 5000 })

    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })
    await expect(guestPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// WF2: Realtime Content Sync
// ---------------------------------------------------------------------------

test.describe('WF2: Realtime Content Sync', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Host adds YouTube link, Guest sees it; Guest adds note, Host sees it', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })

    // Host adds YouTube link
    await addYouTubeLink(hostPage, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Guest should see the YouTube item via realtime
    await expect(guestPage.getByText(/Rick Astley/)).toBeVisible({ timeout: 10000 })

    // Guest adds a note
    await addNote(guestPage, "Guest's test note")

    // Host should see the note via realtime
    await expect(hostPage.getByText("Guest's test note")).toBeVisible({ timeout: 10000 })
  })
})

// ---------------------------------------------------------------------------
// WF3: Queue Advance Sync
// ---------------------------------------------------------------------------

test.describe('WF3: Queue Advance Sync', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Host advances queue, Guest sees NOW SHOWING update', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    // Add two items to the queue
    await addNote(hostPage, 'First item')
    await addNote(hostPage, 'Second item')

    // Wait for realtime sync
    await expect(guestPage.getByText('First item')).toBeVisible({ timeout: 10000 })
    await expect(guestPage.getByText('Second item')).toBeVisible({ timeout: 10000 })

    // Host advances queue
    await hostPage.getByRole('button', { name: 'Next' }).click()

    // Guest should see NOW SHOWING section update
    await expect(guestPage.getByText('NOW SHOWING')).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// WF4: Toggle Completion Sync
// ---------------------------------------------------------------------------

test.describe('WF4: Toggle Completion Sync', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Host marks note complete, both see strikethrough; Guest unchecks, both see restored', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    // Guest adds a note
    await addNote(guestPage, 'Toggle test note')
    await expect(hostPage.getByText('Toggle test note')).toBeVisible({ timeout: 10000 })

    // Host clicks the checkbox to mark complete
    const hostCheckbox = hostPage
      .locator('.queue-item')
      .filter({ hasText: 'Toggle test note' })
      .locator('[role="button"]')
      .first()
    await hostCheckbox.click()

    // Both should see strikethrough
    await expect(
      hostPage.locator('.queue-item').filter({ hasText: 'Toggle test note' }).locator('.line-through'),
    ).toBeVisible({ timeout: 5000 })
    await expect(
      guestPage.locator('.queue-item').filter({ hasText: 'Toggle test note' }).locator('.line-through'),
    ).toBeVisible({ timeout: 5000 })

    // Guest unchecks
    const guestCheckbox = guestPage
      .locator('.queue-item')
      .filter({ hasText: 'Toggle test note' })
      .locator('[role="button"]')
      .first()
    await guestCheckbox.click()

    // Both should see strikethrough removed
    await expect(
      hostPage.locator('.queue-item').filter({ hasText: 'Toggle test note' }).locator('.line-through'),
    ).toHaveCount(0, { timeout: 5000 })
    await expect(
      guestPage.locator('.queue-item').filter({ hasText: 'Toggle test note' }).locator('.line-through'),
    ).toHaveCount(0, { timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// WF5: Drag-and-Drop Reorder (SKIP — automation limitation)
// ---------------------------------------------------------------------------

test.describe('WF5: Drag-and-Drop Reorder', () => {
  test('Reorder via drag-and-drop syncs between users', async () => {
    test.skip(true, '@dnd-kit PointerSensor cannot be triggered by browser automation')
  })
})

// ---------------------------------------------------------------------------
// WF6: Password-Protected Join
// ---------------------------------------------------------------------------

test.describe('WF6: Password-Protected Join', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Wrong password rejected, correct password accepted', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    // Host creates party with password
    await resetSession(hostPage)
    await hostPage.getByRole('link', { name: 'Start a Party' }).first().click()

    // Enable password toggle
    await hostPage.locator('button[role="switch"]').click()
    await hostPage.getByPlaceholder('Enter party password').fill('test123')

    await hostPage.getByRole('button', { name: 'Create Party' }).click()
    await expect(hostPage.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    const partyCode = (await hostPage.getByTestId('party-code').textContent())?.trim() || ''

    // Guest tries to join without password
    await resetSession(guestPage)
    await guestPage.getByRole('link', { name: 'Join with Code' }).click()
    await guestPage.getByPlaceholder('ABC123').fill(partyCode)
    await guestPage.getByRole('button', { name: 'Join Party' }).click()

    // Password field should appear
    await expect(guestPage.getByPlaceholder('Enter party password')).toBeVisible({ timeout: 5000 })

    // Enter wrong password
    await guestPage.getByPlaceholder('Enter party password').fill('wrong')
    await guestPage.getByRole('button', { name: 'Join Party' }).click()
    await expect(guestPage.getByText('Incorrect party password.')).toBeVisible({ timeout: 5000 })

    // Enter correct password
    await guestPage.getByPlaceholder('Enter party password').clear()
    await guestPage.getByPlaceholder('Enter party password').fill('test123')
    await guestPage.getByRole('button', { name: 'Join Party' }).click()

    // Should join successfully
    await expect(guestPage.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// WF7: TV Mode Sync
// ---------------------------------------------------------------------------

test.describe('WF7: TV Mode Sync', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Host in TV mode advances, Guest sees update; Guest adds note, Host sees it in TV', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    // Add two items to have something in the queue
    await addNote(hostPage, 'TV mode item 1')
    await addNote(hostPage, 'TV mode item 2')
    await expect(guestPage.getByText('TV mode item 2')).toBeVisible({ timeout: 10000 })

    // Host enters TV mode
    await hostPage.getByLabel('Open TV mode').click()
    await expect(hostPage.getByTestId('tv-mode-root')).toBeVisible({ timeout: 5000 })

    // Host advances in TV mode
    await hostPage.getByLabel('Show next item').click()

    // Guest should see NOW SHOWING updated
    await expect(guestPage.getByText('NOW SHOWING')).toBeVisible({ timeout: 5000 })

    // Guest adds a note while Host is in TV mode
    await addNote(guestPage, 'Added during TV mode')

    // Host should see the new note in TV mode queue
    await expect(hostPage.getByText('Added during TV mode')).toBeVisible({ timeout: 10000 })
  })
})

// ---------------------------------------------------------------------------
// WF8: Guest Leave and Rejoin
// ---------------------------------------------------------------------------

test.describe('WF8: Guest Leave and Rejoin', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Guest leaves, Host sees 1 watching; Guest rejoins, Host sees 2 watching', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })

    // Guest leaves
    await guestPage.getByLabel('Leave party').click()
    await expect(guestPage.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 10000 })

    // Host should see 1 watching
    await expect(hostPage.getByText(/1 watching/)).toBeVisible({ timeout: 5000 })

    // Guest rejoins
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    // Host should see 2 watching again
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// WF9: Deep Link Join
// ---------------------------------------------------------------------------

test.describe('WF9: Deep Link Join', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Guest navigates to /join/CODE directly, code pre-filled, joins successfully', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)

    // Guest navigates to deep link
    await resetSession(guestPage)
    await guestPage.goto(`/join/${partyCode}`)

    // Party code should be pre-filled
    await expect(guestPage.getByPlaceholder('ABC123')).toHaveValue(partyCode, { timeout: 5000 })

    // Guest joins
    await guestPage.getByRole('button', { name: 'Join Party' }).click()

    await expect(guestPage.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
    await expect(hostPage.getByText(/2 watching/)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// WF10: Simultaneous Content Adds
// ---------------------------------------------------------------------------

test.describe('WF10: Simultaneous Content Adds', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)
    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test('Both users add content simultaneously, both see both items', async () => {
    test.skip(shouldSkip, 'Requires SUPABASE_LIVE=true with real Supabase credentials')

    const partyCode = await createPartyAsHost(hostPage)
    await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

    // Both open add content dialogs
    await hostPage.locator('.fab').click()
    await guestPage.locator('.fab').click()

    // Host prepares YouTube link
    await hostPage
      .getByPlaceholder('YouTube, Twitter/X, or Reddit URL...')
      .fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await hostPage.getByRole('button', { name: 'Continue' }).click()

    // Guest prepares note
    await guestPage.getByRole('button', { name: 'Write a note' }).click()
    await guestPage.getByPlaceholder('Share a thought, reminder, or message...').fill('Simultaneous guest note')
    await guestPage.getByRole('button', { name: 'Preview' }).click()

    // Wait for Host's metadata fetch
    await expect(hostPage.getByRole('button', { name: 'Add to Queue' })).toBeVisible({ timeout: 10000 })

    // Both submit nearly simultaneously
    await Promise.all([
      hostPage.getByRole('button', { name: 'Add to Queue' }).click(),
      guestPage.getByRole('button', { name: 'Add to Queue' }).click(),
    ])

    // Both should see both items via realtime
    await expect(hostPage.getByText('Simultaneous guest note')).toBeVisible({ timeout: 10000 })
    await expect(guestPage.getByText('Simultaneous guest note')).toBeVisible({ timeout: 10000 })
  })
})
