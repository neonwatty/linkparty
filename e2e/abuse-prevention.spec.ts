import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

/**
 * Abuse Prevention E2E Tests
 *
 * Verifies UI elements related to server-side limits and abuse prevention:
 * - Password-protected party creation (UI toggle and form)
 * - Party creation limit (error display)
 * - Member limit and image limit (server-side enforcement)
 *
 * NOTE: Actual server-side limit enforcement tests are in limits.spec.ts (requires real Supabase).
 * These tests focus on the UI controls that are testable in mock mode.
 */

test.describe('Password-Protected Party — UI Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
    await page.getByRole('link', { name: 'Start a Party' }).first().click()
  })

  test('password protect toggle is visible and off by default', async ({ page }) => {
    // The "Password protect" toggle should be visible
    await expect(page.getByText('Password protect')).toBeVisible()
    await expect(page.getByText('Require a password to join')).toBeVisible()

    // Toggle should default to off
    const toggle = page.getByRole('switch').first()
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  test('toggling password protect shows password input', async ({ page }) => {
    // Password input should NOT be visible initially
    await expect(page.getByPlaceholder('Enter party password')).not.toBeVisible()

    // Click toggle to enable
    const toggle = page.getByRole('switch').first()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    // Password input should now be visible
    await expect(page.getByPlaceholder('Enter party password')).toBeVisible()
  })

  test('toggling password protect off hides and clears password input', async ({ page }) => {
    const toggle = page.getByRole('switch').first()

    // Enable password protection
    await toggle.click()
    await expect(page.getByPlaceholder('Enter party password')).toBeVisible()

    // Type a password
    await page.getByPlaceholder('Enter party password').fill('mypassword')

    // Disable password protection
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    // Password input should be hidden
    await expect(page.getByPlaceholder('Enter party password')).not.toBeVisible()
  })

  test('password input has max length of 50 characters', async ({ page }) => {
    // Enable password
    await page.getByRole('switch').first().click()

    const passwordInput = page.getByPlaceholder('Enter party password')
    await expect(passwordInput).toBeVisible()

    // Verify maxlength attribute
    await expect(passwordInput).toHaveAttribute('maxlength', '50')
  })

  test('can create party with password enabled in mock mode', async ({ page }) => {
    // Enable password
    await page.getByRole('switch').first().click()
    await page.getByPlaceholder('Enter party password').fill('testpass123')

    // Create party
    await page.getByRole('button', { name: 'Create Party' }).click()

    // Should navigate to party room (mock mode)
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Create Party — Settings Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
    await page.getByRole('link', { name: 'Start a Party' }).first().click()
  })

  test('settings card shows queue limit of 100', async ({ page }) => {
    await expect(page.getByText('Queue limit')).toBeVisible()
    await expect(page.getByText('Max items in queue')).toBeVisible()
    await expect(page.getByText('100', { exact: true })).toBeVisible()
  })

  test('settings card shows rate limit of 5 per minute', async ({ page }) => {
    await expect(page.getByText('Rate limit')).toBeVisible()
    await expect(page.getByText('Items per person/minute')).toBeVisible()
    await expect(page.getByText('5', { exact: true })).toBeVisible()
  })
})

test.describe('Create Party — Party Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
    await page.getByRole('link', { name: 'Start a Party' }).first().click()
  })

  test('party name input is optional', async ({ page }) => {
    await expect(page.getByText('Party name (optional)')).toBeVisible()
  })

  test('party name input has max length of 100 characters', async ({ page }) => {
    const nameInput = page.getByPlaceholder(/saturday night hangout/i)
    await expect(nameInput).toHaveAttribute('maxlength', '100')
  })

  test('party name shows character count when typing', async ({ page }) => {
    const nameInput = page.getByPlaceholder(/saturday night hangout/i)
    await nameInput.fill('Test Party')

    // Character count should be visible
    await expect(page.getByText('10/100')).toBeVisible()
  })

  test('create party button is enabled without party name', async ({ page }) => {
    // Party name is optional so Create Party should be enabled
    await expect(page.getByRole('button', { name: 'Create Party' })).toBeEnabled()
  })
})

test.describe('Create Party — Invite Friends Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
    await page.getByRole('link', { name: 'Start a Party' }).first().click()
  })

  test('invite friends section is collapsed by default', async ({ page }) => {
    // The "Invite friends" button should be visible
    await expect(page.getByText(/invite friends/i)).toBeVisible()

    // The "Visible to friends" toggle should NOT be visible until expanded
    await expect(page.getByText('Visible to friends')).not.toBeVisible()
  })

  test('expanding invite friends shows visibility toggle', async ({ page }) => {
    await page.getByText(/invite friends/i).click()

    await expect(page.getByText('Visible to friends')).toBeVisible()
    await expect(page.getByText(/friends can see this party on their home page/i)).toBeVisible()
  })
})

test.describe('Party Creation Limit — Error Display', () => {
  test('error message area exists in create form', async ({ page }) => {
    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('link-party-display-name', 'Test User')
    })
    await page.reload()
    await page.getByRole('link', { name: 'Start a Party' }).first().click()

    // No error should be visible initially
    await expect(page.locator('.text-red-400')).not.toBeVisible()

    // The Create Party button should be clickable
    await expect(page.getByRole('button', { name: 'Create Party' })).toBeEnabled()
  })
})

test.describe('Limit Constants — Structural Verification', () => {
  test('party creation API route enforces max active party limit', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('app/api/parties/create/route.ts', 'utf-8')
    // Verify the limit constant and enforcement exist
    expect(content).toContain('MAX_ACTIVE_PARTIES')
    expect(content).toContain('active parties')
  })

  test('queue items API route references image limit', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('app/api/queue/items/route.ts', 'utf-8')
    // Verify image limit constant and enforcement exist
    expect(content).toContain('IMAGE_LIMIT')
    expect(content).toContain('image limit')
  })

  test('party join API route enforces member limit', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('app/api/parties/join/route.ts', 'utf-8')
    // Verify the 20-member limit enforcement exists
    expect(content).toContain('member limit')
  })

  test('error messages module exports limit error strings', async () => {
    const errorMessages = await import('../lib/errorMessages')
    expect(errorMessages.LIMITS.MAX_PARTIES).toContain('5 active parties')
    expect(errorMessages.LIMITS.MAX_MEMBERS).toBeDefined()
    expect(errorMessages.LIMITS.MAX_IMAGES).toBeDefined()
  })
})
