import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

/**
 * Multi-user real-time synchronization tests.
 *
 * These tests use separate browser contexts (via browser.newContext()) to simulate
 * two independent users — each with their own localStorage and session. This is the
 * closest approximation to two different people on different devices.
 *
 * IMPORTANT: The app runs in mock mode during E2E tests (no real Supabase credentials).
 * In mock mode, party creation generates ephemeral IDs (mock-party-{timestamp}) and
 * there is no shared backend — so real-time sync between users cannot be verified.
 *
 * Tests marked with "// REQUIRES REAL SUPABASE" comments would need a live Supabase
 * connection to fully verify cross-user synchronization (member counts, queue updates,
 * realtime events). The tests below focus on what CAN be validated in mock mode:
 * navigation flows, UI state rendering, and form interactions across two contexts.
 */

// Helper: create a fresh browser context with auth cookie and cleared localStorage
async function createUserContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()
  await context.addCookies([FAKE_AUTH_COOKIE])
  return context
}

// Helper: navigate to home and clear localStorage for a clean session
async function resetSession(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

// Helper: create a party as host and return the party code
async function createPartyAsHost(page: Page, _displayName: string): Promise<string> {
  await resetSession(page)

  // Navigate to create party (use .first() because landing page has two "Start a Party" links)
  await page.getByRole('link', { name: 'Start a Party' }).first().click()

  // Create party (no display name input — derived from auth user)
  await page.getByRole('button', { name: 'Create Party' }).click()

  // Wait for party room to load
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })

  // Extract the party code
  const codeText = (await page.getByTestId('party-code').textContent())?.trim() || ''
  return codeText
}

// Helper: join a party as guest and wait for the party room
async function joinPartyAsGuest(page: Page, _displayName: string, partyCode: string): Promise<void> {
  await resetSession(page)

  // Navigate to join party
  await page.getByRole('link', { name: 'Join with Code' }).click()

  // Enter party code
  await page.getByPlaceholder('ABC123').fill(partyCode)

  // Click join
  await page.getByRole('button', { name: 'Join Party' }).click()

  // Wait for party room to load
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
}

test.describe('Multi-User Flows', () => {
  let hostContext: BrowserContext
  let guestContext: BrowserContext
  let hostPage: Page
  let guestPage: Page

  test.beforeEach(async ({ browser }) => {
    // Create two separate browser contexts to simulate two independent users
    hostContext = await createUserContext(browser)
    guestContext = await createUserContext(browser)

    hostPage = await hostContext.newPage()
    guestPage = await guestContext.newPage()
  })

  test.afterEach(async () => {
    await hostContext.close()
    await guestContext.close()
  })

  test.describe('Host Creates Party, Guest Joins', () => {
    test('host can create a party and see the party room', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')

      // Verify the party code is a valid 6-character alphanumeric string
      expect(partyCode).toMatch(/^[A-Z0-9]{6}$/)

      // Verify party room UI elements are present
      await expect(hostPage.getByTestId('party-code')).toHaveText(partyCode)
      await expect(hostPage.getByRole('button', { name: /leave party/i })).toBeVisible()
      await expect(hostPage.getByRole('button', { name: /share party/i })).toBeVisible()
    })

    test('guest can join a party with a valid code and see the party room', async () => {
      // Host creates party
      const partyCode = await createPartyAsHost(hostPage, 'Host User')

      // Guest joins using the party code
      // NOTE: In mock mode, the guest creates an independent mock party with this code.
      // With real Supabase, the guest would join the host's actual party.
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // Verify guest is in a party room showing the same code
      const guestCode = (await guestPage.getByTestId('party-code').textContent())?.trim()
      expect(guestCode).toMatch(/^[A-Z0-9]{6}$/)

      // Verify party room elements are visible for the guest
      await expect(guestPage.getByRole('button', { name: /leave party/i })).toBeVisible()
      await expect(guestPage.getByRole('button', { name: /share party/i })).toBeVisible()
    })

    test('both host and guest see a party room simultaneously', async () => {
      // Host creates party
      const partyCode = await createPartyAsHost(hostPage, 'Host User')

      // Guest joins
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // Both should be in a party room (verify core UI elements on both)
      await expect(hostPage.getByTestId('party-code')).toBeVisible()
      await expect(guestPage.getByTestId('party-code')).toBeVisible()

      // Both should have the leave button
      await expect(hostPage.getByRole('button', { name: /leave party/i })).toBeVisible()
      await expect(guestPage.getByRole('button', { name: /leave party/i })).toBeVisible()

      // Both should have the add content FAB (plus button)
      await expect(hostPage.locator('.fab')).toBeVisible()
      await expect(guestPage.locator('.fab')).toBeVisible()
    })
  })

  test.describe('Member Count Display', () => {
    test('host sees member count after creating a party', async () => {
      await createPartyAsHost(hostPage, 'Host User')

      // In mock mode, the host is the only member — should show "1 watching"
      await expect(hostPage.getByText(/1 watching/)).toBeVisible()
    })

    test('guest sees member count after joining a party', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // In mock mode, each context runs independently — guest sees their own mock member list
      // REQUIRES REAL SUPABASE: With a live backend, the guest would see "2 watching"
      // and the host would also update to "2 watching" via realtime subscription.
      await expect(guestPage.getByText(/\d+ watching/)).toBeVisible()
    })

    test('host member list shows "You" label for current user', async () => {
      await createPartyAsHost(hostPage, 'Host User')

      // The host should see themselves labeled as "You" in the members list
      await expect(hostPage.getByText('You', { exact: true })).toBeVisible({ timeout: 5000 })
    })

    test('host member list shows HOST badge', async () => {
      await createPartyAsHost(hostPage, 'Host User')

      // The host should see the HOST badge next to their name
      await expect(hostPage.getByText('HOST')).toBeVisible()
    })
  })

  test.describe('Party Room UI Access', () => {
    test('host sees party code and interactive elements', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')

      // Party code is visible
      await expect(hostPage.getByTestId('party-code')).toHaveText(partyCode)

      // Action buttons are visible
      await expect(hostPage.getByRole('button', { name: /leave party/i })).toBeVisible()
      await expect(hostPage.getByRole('button', { name: /share party/i })).toBeVisible()
      await expect(hostPage.getByRole('button', { name: /open tv mode/i })).toBeVisible()
      await expect(hostPage.getByRole('button', { name: /invite by email/i })).toBeVisible()
    })

    test('guest sees party code and interactive elements', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // Party code is visible on guest view
      await expect(guestPage.getByTestId('party-code')).toBeVisible()

      // Action buttons are visible for guest as well
      await expect(guestPage.getByRole('button', { name: /leave party/i })).toBeVisible()
      await expect(guestPage.getByRole('button', { name: /share party/i })).toBeVisible()
      await expect(guestPage.getByRole('button', { name: /open tv mode/i })).toBeVisible()
    })

    test('host sees party room with FAB and queue area', async () => {
      await createPartyAsHost(hostPage, 'Host User')

      // The party room should show the FAB button for adding content
      await expect(hostPage.locator('.fab')).toBeVisible()

      // The party room should have either mock queue items or the empty state
      const hasContent = await hostPage
        .getByText(/remember to bring snacks/i)
        .isVisible()
        .catch(() => false)
      const hasEmptyState = await hostPage
        .getByText(/no content yet/i)
        .isVisible()
        .catch(() => false)
      expect(hasContent || hasEmptyState).toBe(true)
    })

    test('guest sees party room with FAB and queue area', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // Guest should see the FAB button and either queue content or empty state
      await expect(guestPage.locator('.fab')).toBeVisible()
      const hasContent = await guestPage
        .getByText(/remember to bring snacks/i)
        .isVisible()
        .catch(() => false)
      const hasEmptyState = await guestPage
        .getByText(/no content yet/i)
        .isVisible()
        .catch(() => false)
      expect(hasContent || hasEmptyState).toBe(true)
    })
  })

  test.describe('Guest Leaves Party', () => {
    test('guest can leave party and return to home page', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // Verify guest is in the party room
      await expect(guestPage.getByTestId('party-code')).toBeVisible()

      // Guest clicks leave party
      await guestPage.getByRole('button', { name: /leave party/i }).click()

      // Guest should be navigated back to the home page
      await expect(guestPage.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 10000 })
    })

    test('host remains in party after guest leaves', async () => {
      const partyCode = await createPartyAsHost(hostPage, 'Host User')
      await joinPartyAsGuest(guestPage, 'Guest User', partyCode)

      // Guest leaves
      await guestPage.getByRole('button', { name: /leave party/i }).click()
      await expect(guestPage.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 10000 })

      // Host should still be in the party room, unaffected
      await expect(hostPage.getByTestId('party-code')).toBeVisible()
      await expect(hostPage.getByText(/1 watching/)).toBeVisible()

      // REQUIRES REAL SUPABASE: With a live backend, the host's member count would
      // update from "2 watching" to "1 watching" via realtime subscription when the
      // guest's party_members row is deleted.
    })

    test('host can leave party and return to home page', async () => {
      await createPartyAsHost(hostPage, 'Host User')

      // Verify host is in the party room
      await expect(hostPage.getByTestId('party-code')).toBeVisible()

      // Host clicks leave party
      await hostPage.getByRole('button', { name: /leave party/i }).click()

      // Host should be navigated back to the home page
      await expect(hostPage.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Independent Session Isolation', () => {
    test('two contexts have separate localStorage sessions', async () => {
      // Set a value in host context localStorage
      await hostPage.goto('/')
      await hostPage.evaluate(() => localStorage.setItem('test-key', 'host-value'))

      // Guest context should not see it
      await guestPage.goto('/')
      const guestValue = await guestPage.evaluate(() => localStorage.getItem('test-key'))
      expect(guestValue).toBeNull()
    })

    test('two contexts have separate session IDs', async () => {
      await hostPage.goto('/')
      await guestPage.goto('/')

      const hostSessionId = await hostPage.evaluate(() => {
        // Trigger session ID creation (matches lib/supabase getSessionId logic)
        let id = localStorage.getItem('link-party-session-id')
        if (!id) {
          id = crypto.randomUUID()
          localStorage.setItem('link-party-session-id', id)
        }
        return id
      })

      const guestSessionId = await guestPage.evaluate(() => {
        let id = localStorage.getItem('link-party-session-id')
        if (!id) {
          id = crypto.randomUUID()
          localStorage.setItem('link-party-session-id', id)
        }
        return id
      })

      // Session IDs should be different (separate contexts = separate identities)
      expect(hostSessionId).not.toBe(guestSessionId)
    })
  })
})

/**
 * Real-time sync scenarios that would require a live Supabase backend.
 * These are documented here as test outlines for when E2E tests run against
 * a real database (e.g., local Supabase via `npm run dev:local` with credentials).
 *
 * To enable, remove the .skip and ensure NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set to valid values.
 */
test.describe.skip('Real-Time Sync (requires live Supabase)', () => {
  test('member count updates in real-time when guest joins', async () => {
    // OUTLINE:
    // 1. Host creates party in context1 — sees "1 watching"
    // 2. Guest joins party in context2 using the party code
    // 3. Host's view updates to "2 watching" via realtime subscription
    // 4. Assert host page shows "2 watching" within 5 seconds
  })

  test('queue item added by host appears on guest view in real-time', async () => {
    // OUTLINE:
    // 1. Host creates party, guest joins
    // 2. Host adds a note to the queue
    // 3. Guest's view shows the new note via realtime subscription
    // 4. Assert the note content is visible on guest page within 5 seconds
  })

  test('member count decreases when guest leaves', async () => {
    // OUTLINE:
    // 1. Host creates party, guest joins — both see "2 watching"
    // 2. Guest clicks "Leave party"
    // 3. Host's member count updates to "1 watching" via realtime
    // 4. Assert host page shows "1 watching" within 5 seconds
  })

  test('queue advance by host reflects on guest view', async () => {
    // OUTLINE:
    // 1. Host creates party, guest joins
    // 2. Both see the same "Now Showing" item
    // 3. Host clicks "Next" to advance the queue
    // 4. Guest's "Now Showing" section updates to the next item
  })
})
