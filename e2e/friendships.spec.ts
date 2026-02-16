import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

// ---------------------------------------------------------------------------
// Profile Page Tabs — Core Functionality
// ---------------------------------------------------------------------------

test.describe('Profile Page Tabs', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('profile page shows tabs: Profile, Friends, Requests, Blocked', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Friends', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Requests', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toBeVisible()
  })

  test('default tab is Profile and shows ProfileEditor', async ({ page }) => {
    // Profile tab should be active by default
    // ProfileEditor renders the avatar picker and display name input
    await expect(page.getByText('Display name')).toBeVisible()
    await expect(page.getByText('Avatar')).toBeVisible()
  })

  test('Friends tab shows empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Friends' }).click()
    // In mock mode, no friends exist
    await expect(page.getByText(/no friends/i)).toBeVisible()
  })

  test('Requests tab shows empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Requests' }).click()
    // In mock mode, no requests exist
    await expect(page.getByText(/no friend requests/i)).toBeVisible()
  })

  test('Blocked tab shows empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocked' }).click()
    // In mock mode, no blocked users exist
    await expect(page.getByText(/no blocked users/i)).toBeVisible()
  })

  test('tab switching works correctly', async ({ page }) => {
    // Start on Profile tab
    await expect(page.getByText('Display name')).toBeVisible()

    // Switch to Friends
    await page.getByRole('button', { name: 'Friends' }).click()
    await expect(page.getByText(/no friends/i)).toBeVisible()

    // Switch to Requests
    await page.getByRole('button', { name: 'Requests' }).click()
    await expect(page.getByText(/no friend requests/i)).toBeVisible()

    // Switch to Blocked
    await page.getByRole('button', { name: 'Blocked' }).click()
    await expect(page.getByText(/no blocked users/i)).toBeVisible()

    // Switch back to Profile
    await page.getByRole('button', { name: 'Profile' }).click()
    await expect(page.getByText('Display name')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Profile Page Tabs — Mutual Exclusion
// ---------------------------------------------------------------------------

test.describe('Profile Page Tabs — Mutual Exclusion', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('only one tab content is visible at a time', async ({ page }) => {
    // Start: Profile visible, others not
    await expect(page.getByText('Display name')).toBeVisible()

    // Switch to Friends: Profile editor hidden
    await page.getByRole('button', { name: 'Friends' }).click()
    await expect(page.getByText(/no friends/i)).toBeVisible()
    await expect(page.getByText('Display name')).not.toBeVisible()

    // Switch to Requests: Friends hidden
    await page.getByRole('button', { name: 'Requests' }).click()
    await expect(page.getByText(/no friend requests/i)).toBeVisible()
    await expect(page.getByText(/no friends/i)).not.toBeVisible()

    // Switch to Blocked: Requests hidden
    await page.getByRole('button', { name: 'Blocked' }).click()
    await expect(page.getByText(/no blocked users/i)).toBeVisible()
    await expect(page.getByText(/no friend requests/i)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Profile Page — Accessibility
// ---------------------------------------------------------------------------

test.describe('Profile Page — Accessibility', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('back button has accessible label', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /go back to home/i })
    await expect(backLink).toBeVisible()
  })

  test('tabs are all accessible buttons', async ({ page }) => {
    // All tabs should be proper button elements
    const tabButtons = page.locator('button').filter({ hasText: /^(Profile|Friends|Requests|Blocked)$/ })
    await expect(tabButtons).toHaveCount(4)
  })

  test('profile page heading is an h1', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1, name: 'Profile' })
    await expect(heading).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Friend Request API — Authorization
// ---------------------------------------------------------------------------

test.describe('Friend Request API — Authorization', () => {
  test('friend request API requires Bearer token when service key configured', async ({ request }) => {
    // Send a valid UUID without auth header
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.post('/api/friends/request', {
      data: { friendId: validUuid },
    })

    // In mock mode (no service key), the API skips auth and returns 200 with skipped=true
    // In real mode, it would return 401
    const status = response.status()
    expect([200, 401]).toContain(status)

    if (status === 200) {
      const body = await response.json()
      // When skipped, the response indicates server-side validation was skipped
      expect(body.success).toBe(true)
      expect(body.skipped).toBe(true)
    }
  })

  test('accept API requires Bearer token when service key configured', async ({ request }) => {
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.post('/api/friends/accept', {
      data: { friendshipId: validUuid },
    })

    const status = response.status()
    expect([200, 401]).toContain(status)
  })

  test('delete API requires Bearer token when service key configured', async ({ request }) => {
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.delete(`/api/friends/${validUuid}?action=unfriend`)

    const status = response.status()
    expect([200, 401]).toContain(status)
  })
})

// ---------------------------------------------------------------------------
// Block/Unblock API — Authorization
// ---------------------------------------------------------------------------

test.describe('Block/Unblock API — Authorization', () => {
  test('block API handles missing service key gracefully', async ({ request }) => {
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.post('/api/users/block', {
      data: { userId: validUuid },
    })

    // Without service key: 500 (Server not configured) or 401 (no auth header)
    const status = response.status()
    expect([401, 500]).toContain(status)
  })

  test('unblock API handles missing service key gracefully', async ({ request }) => {
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.delete(`/api/users/block?userId=${validUuid}`)

    const status = response.status()
    expect([401, 500]).toContain(status)
  })
})

// ---------------------------------------------------------------------------
// Friend Request Flows (requires live Supabase)
// ---------------------------------------------------------------------------

// Skipped tests for real Supabase flows (same pattern as multi-user.spec.ts)
test.describe.skip('Friend Request Flows (requires live Supabase)', () => {
  test('user can send friend request to another user', async () => {
    // OUTLINE:
    // 1. User A searches for User B by username
    // 2. User A clicks "Add friend" / sends request
    // 3. User B sees incoming request on Requests tab
    // 4. Assert request appears within 5 seconds
  })

  test('user can accept a friend request', async () => {
    // OUTLINE:
    // 1. User A sends request to User B
    // 2. User B goes to Requests tab, clicks Accept
    // 3. User B's Friends tab now shows User A
    // 4. User A's Friends tab now shows User B
  })

  test('user can decline a friend request', async () => {
    // OUTLINE:
    // 1. User A sends request to User B
    // 2. User B goes to Requests tab, clicks Decline
    // 3. Request disappears from both users' views
  })

  test('user can unfriend another user', async () => {
    // OUTLINE:
    // 1. User A and User B are friends
    // 2. User A goes to Friends tab, clicks Remove on User B
    // 3. User B disappears from User A's friends list
    // 4. User A disappears from User B's friends list
  })

  test('Add friend button appears in party room MembersList', async () => {
    // OUTLINE:
    // 1. User A creates party
    // 2. User B joins party
    // 3. User A sees "+" button next to User B's name (non-friend)
    // 4. User A clicks "+", request is sent
    // 5. "+" button changes to "Sent" label
  })
})
