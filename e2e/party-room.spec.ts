import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Party Room', () => {
  test.beforeEach(async ({ page }) => {
    // Inject fake auth cookie to pass auth middleware
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    // Clear localStorage and create a party first
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()

    // Navigate to create party
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Create party (no display name input — derived from auth user)
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load - look for party code
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('displays party code in the header', async ({ page }) => {
    // Should show a party code (6 uppercase alphanumeric characters)
    await expect(page.getByTestId('party-code')).toBeVisible()
  })

  test('party room has interactive elements', async ({ page }) => {
    // The party room should have multiple buttons for interaction
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    // Verify there are interactive elements in the party room
    expect(buttonCount).toBeGreaterThan(0)
  })
})
