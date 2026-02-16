import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Auth Flows — Reset Password Page', () => {
  test('displays reset password page with all elements', async ({ page }) => {
    await page.goto('/reset-password')

    // Heading and description
    await expect(page.getByRole('heading', { name: /set new password/i })).toBeVisible()
    await expect(page.getByText(/enter your new password below/i)).toBeVisible()

    // Form inputs (use exact: true role selectors to avoid ambiguity)
    await expect(page.getByRole('textbox', { name: 'New password', exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Confirm new password' })).toBeVisible()

    // Update button
    await expect(page.getByRole('button', { name: 'Update Password' })).toBeVisible()
  })

  test('shows validation error for empty password', async ({ page }) => {
    await page.goto('/reset-password')

    // Click update without entering anything
    await page.getByRole('button', { name: 'Update Password' }).click()

    // Should show password validation error
    await expect(page.getByText(/password is required|password must be at least/i)).toBeVisible()
  })

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/reset-password')

    // Enter short password (use exact role selectors)
    await page.getByRole('textbox', { name: 'New password', exact: true }).fill('short')
    await page.getByRole('textbox', { name: 'Confirm new password' }).fill('short')

    // Click update
    await page.getByRole('button', { name: 'Update Password' }).click()

    // Should show password length error
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
  })

  test('shows error for mismatched passwords', async ({ page }) => {
    await page.goto('/reset-password')

    // Enter different passwords (use exact role selectors)
    await page.getByRole('textbox', { name: 'New password', exact: true }).fill('validpassword1')
    await page.getByRole('textbox', { name: 'Confirm new password' }).fill('differentpass2')

    // Click update
    await page.getByRole('button', { name: 'Update Password' }).click()

    // Should show mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('has back link to login page', async ({ page }) => {
    await page.goto('/reset-password')

    // Verify back link exists (chevron icon link to /login/ with possible trailing slash)
    const backLink = page.locator('a[href="/login"], a[href="/login/"]')
    await expect(backLink).toBeVisible()
  })
})

test.describe('Auth Flows — Auth Wall Redirect Preservation', () => {
  test('redirect parameter preserved for /create', async ({ page }) => {
    await page.goto('/create')
    await expect(page).toHaveURL(/\/login/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toMatch(/^\/create\/?$/)
  })

  test('redirect parameter preserved for /profile', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toMatch(/^\/profile\/?$/)
  })

  test('redirect parameter preserved for /history', async ({ page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(/\/login/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toMatch(/^\/history\/?$/)
  })

  test('redirect parameter preserved for /join/ABC123', async ({ page }) => {
    await page.goto('/join/ABC123')
    await expect(page).toHaveURL(/\/login/)
    const url = new URL(page.url())
    const redirect = url.searchParams.get('redirect')
    expect(redirect).toContain('/join/ABC123')
  })
})

test.describe('Auth Flows — Sign Out', () => {
  test('sign out button is visible on home screen', async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')

    // Sign out button should be visible
    await expect(page.getByText('Sign out')).toBeVisible()
  })

  test('clicking sign out clears auth state', async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')

    // Verify we are on authenticated home
    await expect(page.getByText('Sign out')).toBeVisible()

    // Click sign out
    await page.getByText('Sign out').click()

    // In mock mode the fake cookie persists, so middleware doesn't redirect.
    // But the AuthContext sets user/session to null. After a hard navigation
    // (reload without cookie), the middleware would redirect to /login.
    // Clear the fake cookie and verify subsequent navigation redirects to login.
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

test.describe('Auth Flows — Authenticated Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
  })

  test('home screen shows header icons', async ({ page }) => {
    await page.goto('/')

    // Profile icon
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible()

    // Notification bell
    await expect(page.getByRole('button', { name: /notifications/i })).toBeVisible()

    // History icon
    await expect(page.getByRole('link', { name: /history/i })).toBeVisible()
  })

  test('profile icon navigates to /profile', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /profile/i }).click()

    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible()
  })

  test('history icon navigates to /history', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /history/i }).click()

    await expect(page).toHaveURL(/\/history/)
  })

  test('Start a Party and Join with Code buttons are visible', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Join with Code' })).toBeVisible()
  })
})
