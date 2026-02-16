import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('TV Mode', () => {
  // Run serially to avoid overwhelming the dev server during party creation
  test.describe.configure({ mode: 'serial' })

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

    // Navigate to create party (use .first() since responsive layout renders two links)
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // Create party (no display name input — derived from auth user)
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Wait for party room to load - look for party code
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('navigate to TV mode from party room', async ({ page }) => {
    // Find and click the TV mode button in the party header
    const tvButton = page.getByRole('button', { name: 'Open TV mode' })
    await expect(tvButton).toBeVisible()
    await tvButton.click()

    // Verify we navigated to the TV mode URL
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Verify TV mode page loads with its characteristic layout
    // The exit button should be visible
    await expect(page.getByRole('button', { name: 'Exit TV mode' })).toBeVisible()
  })

  test('TV mode shows party code', async ({ page }) => {
    // Get the party code from the party room before navigating
    const partyCode = await page.getByTestId('party-code').textContent()

    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // The party code should be displayed in the TV mode bottom bar
    await expect(page.getByText(partyCode!)).toBeVisible()
  })

  test('TV mode renders content area', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // The "NOW SHOWING" label is always rendered in the bottom bar
    await expect(page.getByText('NOW SHOWING')).toBeVisible({ timeout: 10000 })
  })

  test('exit TV mode returns to party room', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Click the exit button
    await page.getByRole('button', { name: 'Exit TV mode' }).click()

    // Should return to the party room (URL without /tv, may have trailing slash)
    await expect(page).toHaveURL(/\/party\/[^/]+\/?$/, { timeout: 10000 })

    // Party code should be visible again in the party room
    await expect(page.getByTestId('party-code')).toBeVisible()
  })

  test('TV mode URL structure works with direct navigation', async ({ page }) => {
    // Extract the party ID from the current URL
    const partyRoomUrl = page.url()
    const tvUrl = partyRoomUrl + '/tv'

    // Navigate directly to the TV mode URL
    await page.goto(tvUrl)

    // TV mode should load - verify exit button is present
    await expect(page.getByRole('button', { name: 'Exit TV mode' })).toBeVisible({ timeout: 10000 })
  })

  test('TV mode displays member count', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // In mock mode there is 1 member - the bottom bar shows the count next to the users icon
    // Target the party info bar area at the bottom which contains the party code and member count
    const partyInfoBar = page.locator('.border-t.border-white\\/10')
    await expect(partyInfoBar).toBeVisible()

    // The member count span should contain "1"
    const memberCount = partyInfoBar.locator('span').filter({ hasText: /^1$/ })
    await expect(memberCount).toBeVisible()
  })

  test('TV mode has black background', async ({ page }) => {
    // Navigate to TV mode
    await page.getByRole('button', { name: 'Open TV mode' }).click()
    await expect(page).toHaveURL(/\/party\/[^/]+\/tv/, { timeout: 10000 })

    // Verify the TV mode root container is present and has a black background
    const rootDiv = page.getByTestId('tv-mode-root')
    await expect(rootDiv).toBeVisible({ timeout: 10000 })
    await expect(rootDiv).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  })
})
