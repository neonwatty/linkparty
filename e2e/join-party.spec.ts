import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Join Party Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake auth cookie to pass auth middleware
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    // Clear localStorage to reset session
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('shows validation error without complete party code', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('link', { name: 'Join with Code' }).click()

    // Enter incomplete party code
    await page.getByPlaceholder('ABC123').fill('ABC')

    // The Join button is disabled when code is not 6 characters
    await expect(page.getByRole('button', { name: 'Join Party' })).toBeDisabled()
  })

  test('converts party code to uppercase', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('link', { name: 'Join with Code' }).click()

    // Enter lowercase party code
    const codeInput = page.getByPlaceholder('ABC123')
    await codeInput.fill('abc123')

    // Should convert to uppercase
    await expect(codeInput).toHaveValue('ABC123')
  })

  test('limits party code to 6 characters', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('link', { name: 'Join with Code' }).click()

    // Enter more than 6 characters
    const codeInput = page.getByPlaceholder('ABC123')
    await codeInput.fill('ABC123456789')

    // Should be limited to 6 characters
    await expect(codeInput).toHaveValue('ABC123')
  })

  test('can go back to home from join party screen', async ({ page }) => {
    await page.goto('/')

    // Navigate to join party
    await page.getByRole('link', { name: 'Join with Code' }).click()

    // Should be on join party screen
    await expect(page.getByRole('heading', { name: /join a party/i })).toBeVisible()

    // Click back link
    await page.getByRole('link', { name: /go back to home/i }).click()

    // Should be back on home screen - look for the Start a Party link
    await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()
  })
})
