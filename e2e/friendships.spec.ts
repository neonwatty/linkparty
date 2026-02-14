import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

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

  test('tab switching works correctly', async ({ page }) => {
    // Start on Profile tab
    await expect(page.getByText('Display name')).toBeVisible()

    // Switch to Friends
    await page.getByRole('button', { name: 'Friends' }).click()
    await expect(page.getByText(/no friends/i)).toBeVisible()

    // Switch to Requests
    await page.getByRole('button', { name: 'Requests' }).click()
    await expect(page.getByText(/no friend requests/i)).toBeVisible()

    // Switch back to Profile
    await page.getByRole('button', { name: 'Profile' }).click()
    await expect(page.getByText('Display name')).toBeVisible()
  })
})

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
