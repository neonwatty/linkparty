import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Create Party Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake auth cookie to pass auth middleware
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    // Clear localStorage to reset rate limits and session
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
  })

  test('creates a party successfully', async ({ page }) => {
    await page.goto('/')

    // Navigate to create party
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Optionally enter party name
    await page.getByPlaceholder(/saturday night hangout/i).fill('Test Party')

    // Create the party
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Should navigate to party room (mock mode creates party instantly)
    // Wait for party room elements - look for the party code which should be visible
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('displays party code after creation', async ({ page }) => {
    await page.goto('/')

    // Navigate to create party
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Create the party
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Should show a party code (6 characters)
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('can go back to home from create party screen', async ({ page }) => {
    await page.goto('/')

    // Navigate to create party
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Should be on create party screen
    await expect(page.getByRole('heading', { name: /start a party/i })).toBeVisible()

    // Click back link
    await page.getByRole('link', { name: /go back to home/i }).click()

    // Should be back on home screen - look for the Start a Party link
    await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()
  })
})
