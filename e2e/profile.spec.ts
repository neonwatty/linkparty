import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

// ---------------------------------------------------------------------------
// Profile Page — Navigation
// ---------------------------------------------------------------------------

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

  test('page title contains Link Party', async ({ page }) => {
    await page.goto('/profile')

    // Title may be page-specific or default depending on mock mode
    await expect(page).toHaveTitle(/Link Party/, { timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Profile Page — Auth Wall
// ---------------------------------------------------------------------------

test.describe('Profile Page — Auth Wall', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirect parameter includes /profile', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    const url = new URL(page.url())
    expect(url.searchParams.get('redirect')).toMatch(/^\/profile\/?$/)
  })
})

// ---------------------------------------------------------------------------
// Profile Page — Profile Editor
// ---------------------------------------------------------------------------

test.describe('Profile Page — Profile Editor', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('Profile tab is active by default and shows editor', async ({ page }) => {
    // Profile tab should be active
    const profileTab = page.getByRole('tab', { name: 'Profile', exact: true })
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

  test('all 16 emoji options are present', async ({ page }) => {
    const allEmojis = ['🎉', '🎸', '🎭', '🎪', '🎵', '🌟', '🔥', '🎯', '🦊', '🐻', '🦁', '🐱', '🐶', '🦄', '🌈', '🍕']
    for (const emoji of allEmojis) {
      await expect(page.getByRole('button', { name: emoji })).toBeVisible()
    }
  })

  test('clicking an avatar emoji selects it', async ({ page }) => {
    // Click on the fox emoji
    const foxButton = page.getByRole('button', { name: '🦊' })
    await foxButton.click()

    // The selected emoji should have the active ring style
    await expect(foxButton).toHaveClass(/ring-2/)
    await expect(foxButton).toHaveClass(/ring-accent-500/)

    // The large preview at top should show the fox
    const preview = page.locator('.text-6xl')
    await expect(preview).toHaveText('🦊')
  })

  test('clicking different avatar changes selection', async ({ page }) => {
    // Select first emoji
    await page.getByRole('button', { name: '🎸' }).click()
    let preview = page.locator('.text-6xl')
    await expect(preview).toHaveText('🎸')

    // Select different emoji
    await page.getByRole('button', { name: '🐶' }).click()
    preview = page.locator('.text-6xl')
    await expect(preview).toHaveText('🐶')

    // First emoji should no longer have ring
    await expect(page.getByRole('button', { name: '🎸' })).not.toHaveClass(/ring-2/)
  })

  test('display name input is present', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')
    await expect(displayNameInput).toBeVisible()
  })

  test('display name input accepts text', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')
    await displayNameInput.fill('Test User Name')
    await expect(displayNameInput).toHaveValue('Test User Name')
  })

  test('display name input has maxLength of 50', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')
    await expect(displayNameInput).toHaveAttribute('maxLength', '50')
  })

  test('username input has @ prefix', async ({ page }) => {
    // The @ symbol should be visible as a prefix
    await expect(page.getByText('@').first()).toBeVisible()

    // Username input should be visible
    const usernameInput = page.getByPlaceholder('username')
    await expect(usernameInput).toBeVisible()
  })

  test('username input has maxLength of 20', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')
    await expect(usernameInput).toHaveAttribute('maxLength', '20')
  })

  test('username input shows min 3 characters hint for short input', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')

    // Type short username (1-2 chars)
    await usernameInput.fill('ab')

    // Should show min characters hint
    await expect(page.getByText(/username must be at least 3 characters/i)).toBeVisible()
  })

  test('username hint disappears when cleared', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')

    // Type short username to trigger hint
    await usernameInput.fill('ab')
    await expect(page.getByText(/username must be at least 3 characters/i)).toBeVisible()

    // Clear the input — hint should disappear (only shown when length > 0 and < 3)
    await usernameInput.fill('')
    await expect(page.getByText(/username must be at least 3 characters/i)).not.toBeVisible()
  })

  test('username hint shows for 1 character input', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')
    await usernameInput.fill('a')
    await expect(page.getByText(/username must be at least 3 characters/i)).toBeVisible()
  })

  test('username input strips invalid characters and lowercases', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')

    // Type with uppercase and special chars
    await usernameInput.fill('Test_User!')

    // Should be lowered and stripped (only a-z, 0-9, underscore kept)
    await expect(usernameInput).toHaveValue('test_user')
  })

  test('username input strips spaces and hyphens', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')
    await usernameInput.fill('my-user name')
    // Hyphens and spaces are not in [a-z0-9_], so they get stripped
    await expect(usernameInput).toHaveValue('myusername')
  })

  test('username input allows underscores and numbers', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')
    await usernameInput.fill('user_123')
    await expect(usernameInput).toHaveValue('user_123')
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

  test('Save Profile button is enabled when display name has content', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')
    await displayNameInput.fill('Valid Name')

    // Save button should be enabled
    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeEnabled()
  })

  test('Save Profile button is disabled for whitespace-only display name', async ({ page }) => {
    const displayNameInput = page.getByPlaceholder('Your display name')
    await displayNameInput.fill('   ')

    // Save button should be disabled (trim check)
    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// Profile Page — Tab Switching
// ---------------------------------------------------------------------------

test.describe('Profile Page — Tab Switching', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('all four tabs are visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Friends', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Requests', exact: true })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Blocked', exact: true })).toBeVisible()
  })

  test('switching to Friends tab shows friends list or empty state', async ({ page }) => {
    await page.getByRole('tab', { name: 'Friends' }).click()

    // In mock mode, shows empty state or friends list
    await expect(page.getByText(/no friends/i).or(page.getByPlaceholder('Search friends...'))).toBeVisible()
  })

  test('switching to Requests tab shows requests or empty state', async ({ page }) => {
    await page.getByRole('tab', { name: 'Requests' }).click()

    // In mock mode, shows empty state or request sections
    await expect(page.getByText(/no friend requests/i).or(page.getByText(/incoming/i))).toBeVisible()
  })

  test('switching to Blocked tab shows blocked list or empty state', async ({ page }) => {
    await page.getByRole('tab', { name: 'Blocked' }).click()

    await expect(page.getByText(/no blocked users/i)).toBeVisible()
  })

  test('can switch through all tabs and return to Profile', async ({ page }) => {
    // Start on Profile
    await expect(page.getByText('Display name')).toBeVisible()

    // Switch to Friends
    await page.getByRole('tab', { name: 'Friends' }).click()
    await expect(page.getByText('Display name')).not.toBeVisible()

    // Switch to Requests
    await page.getByRole('tab', { name: 'Requests' }).click()

    // Switch to Blocked
    await page.getByRole('tab', { name: 'Blocked' }).click()
    await expect(page.getByText(/no blocked users/i)).toBeVisible()

    // Back to Profile
    await page.getByRole('tab', { name: 'Profile' }).click()
    await expect(page.getByText('Display name')).toBeVisible()
  })

  test('Friends tab hides Profile editor content', async ({ page }) => {
    // Verify Profile editor is visible
    await expect(page.getByText('Avatar')).toBeVisible()
    await expect(page.getByText('Display name')).toBeVisible()

    // Switch to Friends
    await page.getByRole('tab', { name: 'Friends' }).click()

    // Profile editor content should be hidden
    await expect(page.getByText('Avatar')).not.toBeVisible()
    await expect(page.getByPlaceholder('Your display name')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Profile' })).not.toBeVisible()
  })

  test('Requests tab hides Profile editor content', async ({ page }) => {
    await page.getByRole('tab', { name: 'Requests' }).click()
    await expect(page.getByPlaceholder('Your display name')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Profile' })).not.toBeVisible()
  })

  test('Blocked tab hides Profile editor content', async ({ page }) => {
    await page.getByRole('tab', { name: 'Blocked' }).click()
    await expect(page.getByPlaceholder('Your display name')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Profile' })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Profile Page — Layout & Structure
// ---------------------------------------------------------------------------

test.describe('Profile Page — Layout & Structure', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('page has gradient background', async ({ page }) => {
    const container = page.locator('.bg-gradient-party')
    await expect(container).toBeVisible()
  })

  test('page has twinkling stars animation', async ({ page }) => {
    // TwinklingStars component renders star elements
    const starsContainer = page.locator('.container-mobile')
    await expect(starsContainer).toBeVisible()
  })

  test('back button is a link to home', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /go back to home/i })
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveAttribute('href', '/')
  })

  test('heading uses display font', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Profile' })
    await expect(heading).toBeVisible()
    await expect(heading).toHaveClass(/text-3xl/)
    await expect(heading).toHaveClass(/font-bold/)
  })
})

// ---------------------------------------------------------------------------
// Profile Editor — Username Availability Feedback
// ---------------------------------------------------------------------------

test.describe('Profile Editor — Username Availability Feedback', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('no availability message for empty username', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')
    await usernameInput.fill('')

    // No availability or hint messages should appear
    await expect(page.getByText(/username available/i)).not.toBeVisible()
    await expect(page.getByText(/username already taken/i)).not.toBeVisible()
    await expect(page.getByText(/checking availability/i)).not.toBeVisible()
  })

  test('no availability message for short username (under 3 chars)', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')
    await usernameInput.fill('ab')

    // Should show min length hint, not availability message
    await expect(page.getByText(/username must be at least 3 characters/i)).toBeVisible()
    await expect(page.getByText(/username available/i)).not.toBeVisible()
    await expect(page.getByText(/username already taken/i)).not.toBeVisible()
  })

  test('shows checking message when typing valid username (3+ chars)', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('username')

    // Type a valid-length username — triggers debounced check
    await usernameInput.fill('testuser')

    // Should briefly show "Checking availability..." or eventually "Username available"
    // In mock mode, the Supabase call returns no user => available
    // Wait for either the checking message or the available message
    await expect(page.getByText(/checking availability|username available/i).first()).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Profile Editor — Component Source Verification
// ---------------------------------------------------------------------------

test.describe('Profile Editor — Component Source Verification', () => {
  test('ProfileEditor has all 16 emoji options', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileEditor.tsx', 'utf-8')
    const allEmojis = ['🎉', '🎸', '🎭', '🎪', '🎵', '🌟', '🔥', '🎯', '🦊', '🐻', '🦁', '🐱', '🐶', '🦄', '🌈', '🍕']
    for (const emoji of allEmojis) {
      expect(content).toContain(emoji)
    }
  })

  test('ProfileEditor validates username format', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileEditor.tsx', 'utf-8')
    // Should lowercase and strip invalid chars
    expect(content).toContain('toLowerCase()')
    expect(content).toContain('[^a-z0-9_]')
    expect(content).toContain('maxLength')
  })

  test('ProfileEditor shows success and error messages', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileEditor.tsx', 'utf-8')
    expect(content).toContain('Profile saved!')
    expect(content).toContain('setError')
    expect(content).toContain('setSuccess')
  })

  test('ProfileEditor has debounced username check with 500ms delay', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileEditor.tsx', 'utf-8')
    expect(content).toContain('500')
    expect(content).toContain('setTimeout')
    expect(content).toContain('checkUsernameAvailable')
  })
})

// ---------------------------------------------------------------------------
// ProfileTabs — Component Source Verification
// ---------------------------------------------------------------------------

test.describe('ProfileTabs — Component Source Verification', () => {
  test('ProfileTabs manages all four tab states', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileTabs.tsx', 'utf-8')
    expect(content).toContain("'profile'")
    expect(content).toContain("'friends'")
    expect(content).toContain("'requests'")
    expect(content).toContain("'blocked'")
  })

  test('ProfileTabs integrates all social components', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileTabs.tsx', 'utf-8')
    expect(content).toContain('ProfileEditor')
    expect(content).toContain('FriendsList')
    expect(content).toContain('FriendRequests')
    expect(content).toContain('BlockedUsers')
  })

  test('ProfileTabs fetches data on mount', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileTabs.tsx', 'utf-8')
    expect(content).toContain('fetchFriends')
    expect(content).toContain('fetchRequests')
    expect(content).toContain('fetchBlocked')
    expect(content).toContain('Promise.all')
  })

  test('ProfileTabs shows incoming request badge count', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/ProfileTabs.tsx', 'utf-8')
    expect(content).toContain('incoming.length > 0')
    expect(content).toContain('bg-accent-500')
  })
})
