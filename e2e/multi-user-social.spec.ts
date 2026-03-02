import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import {
  TEST_USERS,
  shouldSkipLive,
  loginViaPage,
  getAccessToken,
  dismissOfflineBanner,
  apiCreateParty,
  apiSendFriendRequest,
  apiAcceptFriendRequest,
  apiBlockUser,
  apiUnblockUser,
  apiInviteFriends,
  addNote,
  cleanupSocialState,
} from './fixtures'

/**
 * Multi-User Social Workflow Tests (WF11-17)
 *
 * Tests friend requests, notifications, blocking, invites, and queue sync
 * using real Supabase auth with seeded test users.
 *
 * REQUIRES:
 *   - Local Supabase running with seed data (supabase db reset)
 *   - SUPABASE_LIVE=true
 *
 * Run with:
 *   SUPABASE_LIVE=true npx playwright test e2e/multi-user-social.spec.ts --project=chromium
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Longer timeouts for real auth + realtime propagation (2 sequential logins ~20-30s each)
test.setTimeout(120_000)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createPartyViaUI(page: Page): Promise<{ code: string }> {
  await page.getByRole('link', { name: 'Start a Party' }).first().click()
  await page.getByRole('button', { name: 'Create Party' }).click()
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 15000 })
  await dismissOfflineBanner(page)
  const code = (await page.getByTestId('party-code').textContent())?.trim() || ''
  return { code }
}

async function joinPartyViaUI(page: Page, partyCode: string): Promise<void> {
  await page.getByRole('link', { name: 'Join with Code' }).click()
  await page.getByPlaceholder('ABC123').fill(partyCode)
  await page.getByRole('button', { name: 'Join Party' }).click()
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 15000 })
  await dismissOfflineBanner(page)
}

/** Create a friendship between two users via API (send + accept) */
async function createFriendship(baseURL: string, senderToken: string, recipientToken: string, recipientId: string) {
  const sendResult = await apiSendFriendRequest(baseURL, senderToken, recipientId)
  expect(sendResult.status).toBe(200)
  const friendshipId = sendResult.body.friendship.id
  const acceptResult = await apiAcceptFriendRequest(baseURL, recipientToken, friendshipId)
  expect(acceptResult.status).toBe(200)
  return friendshipId
}

// ---------------------------------------------------------------------------
// Serial execution — social tests share user pairs and must not run in parallel
// ---------------------------------------------------------------------------

test.describe('Multi-User Social Workflows', () => {
  // Serial: social tests share user pairs and must not run in parallel.
  // No retries: retrying re-runs the entire serial block (7 tests × 120s timeout).
  // Chromium-only: these test backend logic, not browser rendering — skip Firefox/WebKit.
  test.describe.configure({ mode: 'serial', retries: 0 })

  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name !== 'chromium') {
      test.skip(true, 'Social workflow tests only run on chromium')
    }
  })

  // -------------------------------------------------------------------------
  // WF11: Friend Request from Party Room
  // -------------------------------------------------------------------------

  test.describe('WF11: Friend Request', () => {
    let aliceContext: BrowserContext
    let bobContext: BrowserContext
    let alicePage: Page
    let bobPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      await cleanupSocialState(supabaseUrl, serviceRoleKey, [TEST_USERS.alice.id, TEST_USERS.bob.id])
      aliceContext = await browser.newContext()
      bobContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      bobPage = await bobContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await bobContext?.close()
    })

    test('Alice sends friend request via API, Bob sees notification and accepts', async ({ baseURL }) => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(bobPage, TEST_USERS.bob.email, TEST_USERS.bob.password),
      ])

      const aliceToken = await getAccessToken(TEST_USERS.alice.email, TEST_USERS.alice.password)

      // Alice sends friend request to Bob
      const sendResult = await apiSendFriendRequest(baseURL!, aliceToken, TEST_USERS.bob.id)
      expect(sendResult.status).toBe(200)
      const friendshipId = sendResult.body.friendship.id

      // Bob navigates to home to check notifications
      await bobPage.goto('/')
      await dismissOfflineBanner(bobPage)

      // Bob should see notification bell with indicator
      const bellButton = bobPage.getByLabel(/notifications/i).first()
      await expect(bellButton).toBeVisible({ timeout: 10000 })
      await bellButton.click()

      // Bob should see friend request notification
      await expect(bobPage.getByText(/friend request/i)).toBeVisible({ timeout: 10000 })

      // Bob accepts via API
      const bobToken = await getAccessToken(TEST_USERS.bob.email, TEST_USERS.bob.password)
      const acceptResult = await apiAcceptFriendRequest(baseURL!, bobToken, friendshipId)
      expect(acceptResult.status).toBe(200)

      // Verify friendship exists — Bob navigates to profile to check friends
      await bobPage.goto('/profile')
      await dismissOfflineBanner(bobPage)
      await bobPage.getByRole('tab', { name: /friends/i }).click()
      await expect(bobPage.getByText(TEST_USERS.alice.displayName)).toBeVisible({ timeout: 10000 })
    })
  })

  // -------------------------------------------------------------------------
  // WF12: In-App Notification Delivery
  // -------------------------------------------------------------------------

  test.describe('WF12: Notification Delivery', () => {
    let aliceContext: BrowserContext
    let bobContext: BrowserContext
    let alicePage: Page
    let bobPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      await cleanupSocialState(supabaseUrl, serviceRoleKey, [TEST_USERS.alice.id, TEST_USERS.bob.id])
      aliceContext = await browser.newContext()
      bobContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      bobPage = await bobContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await bobContext?.close()
    })

    test('Alice invites friend Bob to party, Bob sees party invite notification', async ({ baseURL }) => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(bobPage, TEST_USERS.bob.email, TEST_USERS.bob.password),
      ])

      const aliceToken = await getAccessToken(TEST_USERS.alice.email, TEST_USERS.alice.password)
      const bobToken = await getAccessToken(TEST_USERS.bob.email, TEST_USERS.bob.password)

      // Pre-create friendship via API
      await createFriendship(baseURL!, aliceToken, bobToken, TEST_USERS.bob.id)

      // Alice creates a party with visible_to_friends
      const sessionId = `wf12-alice-${Date.now()}`
      const { body: partyResult } = await apiCreateParty(baseURL!, sessionId, TEST_USERS.alice.displayName, {
        partyName: 'Notification Test Party',
        visibleToFriends: true,
      })
      expect(partyResult.success).toBe(true)

      // Alice invites Bob via Friends invite
      const inviteResult = await apiInviteFriends(
        baseURL!,
        aliceToken,
        partyResult.party.id,
        partyResult.party.code,
        'Notification Test Party',
        [TEST_USERS.bob.id],
      )
      expect(inviteResult.status).toBe(200)

      // Bob checks notifications
      await bobPage.goto('/')
      await dismissOfflineBanner(bobPage)
      const bellButton = bobPage.getByLabel(/notifications/i).first()
      await expect(bellButton).toBeVisible({ timeout: 10000 })
      await bellButton.click()
      await expect(bobPage.getByText(/invited you/i)).toBeVisible({ timeout: 10000 })
    })
  })

  // -------------------------------------------------------------------------
  // WF13: Block User Isolation
  // -------------------------------------------------------------------------

  test.describe('WF13: Block User', () => {
    let aliceContext: BrowserContext
    let carolContext: BrowserContext
    let alicePage: Page
    let carolPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      await cleanupSocialState(supabaseUrl, serviceRoleKey, [TEST_USERS.alice.id, TEST_USERS.carol.id])
      aliceContext = await browser.newContext()
      carolContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      carolPage = await carolContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await carolContext?.close()
    })

    test('Alice blocks Carol, friendship removed, friend request from Carol rejected', async ({ baseURL }) => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(carolPage, TEST_USERS.carol.email, TEST_USERS.carol.password),
      ])

      const aliceToken = await getAccessToken(TEST_USERS.alice.email, TEST_USERS.alice.password)
      const carolToken = await getAccessToken(TEST_USERS.carol.email, TEST_USERS.carol.password)

      // Pre-create friendship
      await createFriendship(baseURL!, aliceToken, carolToken, TEST_USERS.carol.id)

      // Alice blocks Carol via API
      const blockResult = await apiBlockUser(baseURL!, aliceToken, TEST_USERS.carol.id)
      expect(blockResult.status).toBe(200)

      // Verify friendship is gone — Alice checks profile
      await alicePage.goto('/profile')
      await dismissOfflineBanner(alicePage)
      await alicePage.getByRole('tab', { name: /friends/i }).click()
      await expect(alicePage.getByText(TEST_USERS.carol.displayName)).not.toBeVisible({ timeout: 5000 })

      // Click Blocked tab — Carol should appear
      await alicePage.getByRole('tab', { name: /blocked/i }).click()
      await expect(alicePage.getByText(TEST_USERS.carol.displayName)).toBeVisible({ timeout: 10000 })

      // Carol tries to send friend request to Alice — should be rejected
      const reqResult = await apiSendFriendRequest(baseURL!, carolToken, TEST_USERS.alice.id)
      expect(reqResult.status).toBe(403)

      // Cleanup: unblock
      await apiUnblockUser(baseURL!, aliceToken, TEST_USERS.carol.id)
    })
  })

  // -------------------------------------------------------------------------
  // WF14: Email Party Invite to Join
  // -------------------------------------------------------------------------

  test.describe('WF14: Email Invite Join', () => {
    let aliceContext: BrowserContext
    let bobContext: BrowserContext
    let alicePage: Page
    let bobPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      aliceContext = await browser.newContext()
      bobContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      bobPage = await bobContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await bobContext?.close()
    })

    test('Bob joins party via invite link with inviter param', async () => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(bobPage, TEST_USERS.bob.email, TEST_USERS.bob.password),
      ])

      const { code: partyCode } = await createPartyViaUI(alicePage)

      // Bob navigates to join URL with inviter param (simulates email invite link)
      await bobPage.goto(`/join/${partyCode}?inviter=${TEST_USERS.alice.id}`)
      await dismissOfflineBanner(bobPage)
      await expect(bobPage.getByPlaceholder('ABC123')).toHaveValue(partyCode, { timeout: 5000 })

      await bobPage.getByRole('button', { name: 'Join Party' }).click()
      await expect(bobPage.getByTestId('party-code')).toBeVisible({ timeout: 15000 })
      await dismissOfflineBanner(bobPage)

      await expect(alicePage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })
      await expect(bobPage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })
    })
  })

  // -------------------------------------------------------------------------
  // WF15: Friends Active Parties on Home Screen
  // -------------------------------------------------------------------------

  test.describe('WF15: Friends Active Parties', () => {
    let aliceContext: BrowserContext
    let bobContext: BrowserContext
    let alicePage: Page
    let bobPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      await cleanupSocialState(supabaseUrl, serviceRoleKey, [TEST_USERS.alice.id, TEST_USERS.bob.id])
      aliceContext = await browser.newContext()
      bobContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      bobPage = await bobContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await bobContext?.close()
    })

    test('Alice creates visible party, Bob sees it on home screen', async ({ baseURL }) => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(bobPage, TEST_USERS.bob.email, TEST_USERS.bob.password),
      ])

      // Navigate Bob away from home immediately to prevent caching an empty friends-active response.
      // The friends-active API returns Cache-Control: max-age=30, and the initial fetch (before the
      // party exists) would cache { parties: [] } for 30 seconds, preventing the UI from showing data.
      await bobPage.goto('/profile')

      const aliceToken = await getAccessToken(TEST_USERS.alice.email, TEST_USERS.alice.password)
      const bobToken = await getAccessToken(TEST_USERS.bob.email, TEST_USERS.bob.password)

      // Pre-create friendship
      await createFriendship(baseURL!, aliceToken, bobToken, TEST_USERS.bob.id)

      // Alice creates a party with visible_to_friends via API (with auth so user_id is set on party_members)
      const sessionId = `wf15-alice-${Date.now()}`
      const { body: partyResult } = await apiCreateParty(baseURL!, sessionId, TEST_USERS.alice.displayName, {
        partyName: 'Visible Friends Party',
        visibleToFriends: true,
        userId: TEST_USERS.alice.id,
        accessToken: aliceToken,
      })
      expect(partyResult.success).toBe(true)

      // Bob navigates to home — should see friend's active party
      // The friends-active fetch depends on AuthContext hydrating the user first,
      // so allow extra time for session hydration + API redirect (trailingSlash: true) + response.
      await bobPage.goto('/')
      await dismissOfflineBanner(bobPage)
      await expect(bobPage.getByText(/Visible Friends Party/i).first()).toBeVisible({ timeout: 45000 })
    })
  })

  // -------------------------------------------------------------------------
  // WF16: Queue Deletion Sync
  // -------------------------------------------------------------------------

  test.describe('WF16: Queue Deletion Sync', () => {
    let aliceContext: BrowserContext
    let bobContext: BrowserContext
    let alicePage: Page
    let bobPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      aliceContext = await browser.newContext()
      bobContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      bobPage = await bobContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await bobContext?.close()
    })

    test('Alice deletes a queue item, Bob sees it removed via realtime', async () => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(bobPage, TEST_USERS.bob.email, TEST_USERS.bob.password),
      ])

      const { code: partyCode } = await createPartyViaUI(alicePage)
      await joinPartyViaUI(bobPage, partyCode)
      await expect(alicePage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })

      // Add two notes — first auto-advances to NOW SHOWING, second stays in queue
      await addNote(alicePage, 'Filler note')
      await addNote(alicePage, 'Delete me please')

      // Bob should see both via realtime
      await expect(bobPage.getByText('Delete me please')).toBeVisible({ timeout: 10000 })

      // Alice clicks the note text (in "Up next") to open actions sheet
      await alicePage.getByText('Delete me please').click()

      // Click "Remove from Queue" in the actions sheet
      await expect(alicePage.getByText('Remove from Queue')).toBeVisible({ timeout: 5000 })
      await alicePage.getByText('Remove from Queue').click()

      // Confirmation dialog appears — click "Remove" to confirm
      await expect(alicePage.getByRole('alertdialog')).toBeVisible({ timeout: 5000 })
      await alicePage.getByRole('button', { name: /^remove$/i }).click()

      // Wait for dialog to dismiss
      await expect(alicePage.getByRole('alertdialog')).toBeHidden({ timeout: 10000 })

      // Bob should see the item disappear via realtime
      await expect(bobPage.getByText('Delete me please')).toBeHidden({ timeout: 10000 })
      await expect(alicePage.getByText('Delete me please')).toBeHidden({ timeout: 5000 })
    })
  })

  // -------------------------------------------------------------------------
  // WF17: Note Edit Sync
  // -------------------------------------------------------------------------

  test.describe('WF17: Note Edit Sync', () => {
    let aliceContext: BrowserContext
    let bobContext: BrowserContext
    let alicePage: Page
    let bobPage: Page

    test.beforeEach(async ({ browser }) => {
      test.skip(shouldSkipLive(), 'Requires SUPABASE_LIVE=true with seeded test users')
      aliceContext = await browser.newContext()
      bobContext = await browser.newContext()
      alicePage = await aliceContext.newPage()
      bobPage = await bobContext.newPage()
    })

    test.afterEach(async () => {
      await aliceContext?.close()
      await bobContext?.close()
    })

    test('Alice edits a note, Bob sees updated text via realtime', async () => {
      await Promise.all([
        loginViaPage(alicePage, TEST_USERS.alice.email, TEST_USERS.alice.password),
        loginViaPage(bobPage, TEST_USERS.bob.email, TEST_USERS.bob.password),
      ])

      const { code: partyCode } = await createPartyViaUI(alicePage)
      await joinPartyViaUI(bobPage, partyCode)
      await expect(alicePage.getByText(/2 watching/)).toBeVisible({ timeout: 10000 })

      // Add two notes — first auto-advances to NOW SHOWING, second stays in queue
      await addNote(alicePage, 'Filler note')
      await addNote(alicePage, 'Original note text')

      // Bob should see the note via realtime
      await expect(bobPage.getByText('Original note text')).toBeVisible({ timeout: 10000 })

      // Alice clicks the note text (in "Up next") to open actions sheet
      await alicePage.getByText('Original note text').click()

      // Click "Edit Note" (only visible for own items)
      await expect(alicePage.getByText('Edit Note')).toBeVisible({ timeout: 5000 })
      await alicePage.getByText('Edit Note').click()

      // Edit the note content in the NoteEditModal
      const noteInput = alicePage.getByPlaceholder('Write your note...')
      await expect(noteInput).toBeVisible({ timeout: 5000 })
      await noteInput.clear()
      await noteInput.fill('Updated note text')

      // Click "Save Note" to save the edit
      await alicePage.getByRole('button', { name: 'Save Note' }).click()

      // Bob should see the updated text via realtime
      await expect(bobPage.getByText('Updated note text')).toBeVisible({ timeout: 10000 })
      await expect(bobPage.getByText('Original note text')).not.toBeVisible({ timeout: 5000 })
    })
  })
})
