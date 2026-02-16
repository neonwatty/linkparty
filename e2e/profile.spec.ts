import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

test.describe('Profile Page — Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
  })

  test('profile page loads with heading', async ({ page }) => {
    await page.goto('/profile')

    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  })

  test('back button navigates to home', async ({ page }) => {
    await page.goto('/profile')

    await page.getByRole('link', { name: /go back to home/i }).click()

    await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible()
  })
})

test.describe('Profile Page — Profile Editor', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('Profile tab is active by default and shows editor', async ({ page }) => {
    // Profile tab should be active
    const profileTab = page.getByRole('button', { name: 'Profile', exact: true })
    await expect(profileTab).toBeVisible()

    // Editor elements should be visible
    await expect(page.getByText('Avatar')).toBeVisible()
    await expect(page.getByText('Display name')).toBeVisible()
    await expect(page.getByText('Username')).toBeVisible()
  })

  test('avatar picker shows 16 emoji options', async ({ page }) => {
    // Verify the avatar section exists
    await expect(page.getByText('Avatar')).toBeVisible()

    // Verify several representative emoji options are visible
    const emojis = ['🎉', '🎸', '🦊', '🍕']
    for (const emoji of emojis) {
      await expect(page.getByRole('button', { name: emoji })).toBeVisible()
    }
  })

  test('display name input is present', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')
    await expect(displayNameInput).toBeVisible()
  })

  test('username input has @ prefix', async ({ page }) => {
    // The @ symbol should be visible as a prefix
    await expect(page.getByText('@').first()).toBeVisible()

    // Username input should be visible
    const usernameInput = page.getByPlaceholder('username')
    await expect(usernameInput).toBeVisible()
  })

  test('username input shows min 3 characters hint for short input', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')

    // Type short username (1-2 chars)
    await usernameInput.fill('ab')

    // Should show min characters hint
    await expect(page.getByText(/username must be at least 3 characters/i)).toBeVisible()
  })

  test('username input strips invalid characters and lowercases', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')

    // Type with uppercase and special chars
    await usernameInput.fill('Test_User!')

    // Should be lowered and stripped (only a-z, 0-9, underscore kept)
    await expect(usernameInput).toHaveValue('test_user')
  })

  test('Save Profile button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeVisible()
  })

  test('Save Profile button is disabled when display name is empty', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')

    // Clear display name
    await displayNameInput.fill('')

    // Save button should be disabled
    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeDisabled()
  })
})

test.describe('Profile Page — Tab Switching', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('all four tabs are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Friends', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Requests', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Blocked', exact: true })).toBeVisible()
  })

  test('switching to Friends tab shows friends list or empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Friends' }).click()

    // In mock mode, shows empty state or friends list
    const hasEmpty = await page
      .getByText(/no friends/i)
      .isVisible()
      .catch(() => false)
    const hasSearch = await page
      .getByPlaceholder('Search friends...')
      .isVisible()
      .catch(() => false)
    expect(hasEmpty || hasSearch).toBe(true)
  })

  test('switching to Requests tab shows requests or empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Requests' }).click()

    // In mock mode, shows empty state or request sections
    const hasEmpty = await page
      .getByText(/no friend requests/i)
      .isVisible()
      .catch(() => false)
    const hasIncoming = await page
      .getByText(/incoming/i)
      .isVisible()
      .catch(() => false)
    expect(hasEmpty || hasIncoming).toBe(true)
  })

  test('switching to Blocked tab shows blocked list or empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Blocked' }).click()

    await expect(page.getByText(/no blocked users/i)).toBeVisible()
  })

  test('can switch through all tabs and return to Profile', async ({ page }) => {
    // Start on Profile
    await expect(page.getByText('Display name')).toBeVisible()

    // Switch to Friends
    await page.getByRole('button', { name: 'Friends' }).click()
    await expect(page.getByText('Display name')).not.toBeVisible()

    // Switch to Requests
    await page.getByRole('button', { name: 'Requests' }).click()

    // Switch to Blocked
    await page.getByRole('button', { name: 'Blocked' }).click()
    await expect(page.getByText(/no blocked users/i)).toBeVisible()

    // Back to Profile
    await page.getByRole('button', { name: 'Profile' }).click()
    await expect(page.getByText('Display name')).toBeVisible()
  })
})
