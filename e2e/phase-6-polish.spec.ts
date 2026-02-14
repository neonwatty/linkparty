import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Phase 6 — Profile Blocked Tab', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('profile page shows Blocked tab', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toBeVisible()
  })

  test('Blocked tab shows empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocked' }).click()
    await expect(page.getByText(/no blocked users/i)).toBeVisible()
  })

  test('all four tabs are present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Friends', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Requests', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toBeVisible()
  })

  test('switching between all tabs works', async ({ page }) => {
    // Default: Profile
    await expect(page.getByText('Display name')).toBeVisible()

    // Friends
    await page.getByRole('button', { name: 'Friends' }).click()
    await expect(page.getByText(/no friends/i)).toBeVisible()

    // Requests
    await page.getByRole('button', { name: 'Requests' }).click()
    await expect(page.getByText(/no friend requests/i)).toBeVisible()

    // Blocked
    await page.getByRole('button', { name: 'Blocked' }).click()
    await expect(page.getByText(/no blocked users/i)).toBeVisible()

    // Back to Profile
    await page.getByRole('button', { name: 'Profile' }).click()
    await expect(page.getByText('Display name')).toBeVisible()
  })
})

test.describe('Phase 6 — Friends List Block Button', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('Friends tab shows Remove and Block buttons when friends exist (mock mode renders empty)', async ({ page }) => {
    // In mock mode, the friends list is empty so we can only verify the empty state renders
    await page.getByRole('button', { name: 'Friends' }).click()
    await expect(page.getByText(/no friends/i)).toBeVisible()
  })
})

test.describe('Phase 6 — Email Invite Dedup (code review)', () => {
  test('invite API route has dedup check for existing invite tokens', async () => {
    // Structural verification: the dedup logic exists in the invite API route
    // Actual server-side dedup is tested via integration tests with live Supabase
    const fs = await import('fs')
    const routeContent = fs.readFileSync('app/api/emails/invite/route.ts', 'utf-8')
    expect(routeContent).toContain('existingToken')
    expect(routeContent).toContain('already been invited')
    expect(routeContent).toContain('409')
  })
})

test.describe('Phase 6 — Error Messages', () => {
  test('error messages module exports FRIENDS.RATE_LIMITED', async () => {
    // This is a structural test to verify the error messages exist
    // The actual rate limiting is tested server-side
    const errorMessages = await import('../lib/errorMessages')
    expect(errorMessages.FRIENDS.RATE_LIMITED).toBeDefined()
    expect(errorMessages.FRIENDS.BLOCKED).toBeDefined()
    expect(typeof errorMessages.FRIENDS.RATE_LIMITED).toBe('string')
    expect(typeof errorMessages.FRIENDS.BLOCKED).toBe('string')
  })
})
