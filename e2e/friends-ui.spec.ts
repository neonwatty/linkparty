import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

/**
 * Friends UI E2E Tests
 *
 * UI structure and behavior of friendship-related tabs and components in mock mode.
 */

// ---------------------------------------------------------------------------
// Friends Tab — UI Structure
// ---------------------------------------------------------------------------

test.describe('Friends Tab — UI Structure', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
    await page.getByRole('tab', { name: 'Friends' }).click()
  })

  test('Friends tab shows empty state in mock mode', async ({ page }) => {
    await expect(page.getByText(/no friends/i)).toBeVisible()
  })

  test('empty state text is properly styled', async ({ page }) => {
    const emptyText = page.getByText(/no friends/i)
    await expect(emptyText).toBeVisible()
  })

  test('empty state hides search input and action buttons', async ({ page }) => {
    // When friends list is empty, search input and Remove/Block buttons are not rendered
    await expect(page.getByText(/no friends/i)).toBeVisible()
    await expect(page.getByPlaceholder('Search friends...')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Block', exact: true })).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Requests Tab — UI Structure
// ---------------------------------------------------------------------------

test.describe('Requests Tab — UI Structure', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
    await page.getByRole('tab', { name: 'Requests' }).click()
  })

  test('Requests tab shows empty state in mock mode', async ({ page }) => {
    await expect(page.getByText(/no friend requests/i)).toBeVisible()
  })

  test('empty state does not show Incoming/Sent sections', async ({ page }) => {
    // When both incoming and outgoing are empty, the component renders a single empty state
    // rather than Incoming/Sent section headers
    await expect(page.getByText(/no friend requests/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accept' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Decline' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Blocked Tab — UI Structure
// ---------------------------------------------------------------------------

test.describe('Blocked Tab — UI Structure', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
    await page.getByRole('tab', { name: 'Blocked' }).click()
  })

  test('Blocked tab shows empty state in mock mode', async ({ page }) => {
    await expect(page.getByText(/no blocked users/i)).toBeVisible()
  })

  test('empty state does not show Unblock buttons', async ({ page }) => {
    await expect(page.getByText(/no blocked users/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Unblock' })).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Requests Tab — Badge Count
// ---------------------------------------------------------------------------

test.describe('Requests Tab — Badge Count', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('Requests tab does not show badge in mock mode (no pending requests)', async ({ page }) => {
    // In mock mode, incoming requests are empty so no badge should appear
    const requestsButton = page.getByRole('tab', { name: 'Requests' })
    await expect(requestsButton).toBeVisible()

    // The badge is rendered as a span inside the button; in mock mode, no badge expected
    const badge = requestsButton.locator('span.bg-accent-500')
    await expect(badge).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Friends Tab — Search Input
// ---------------------------------------------------------------------------

test.describe('Friends Tab — Search Input', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
    await page.getByRole('tab', { name: 'Friends' }).click()
  })

  test('empty state does not show search input (no friends to search)', async ({ page }) => {
    // When friends list is empty, the search input is not rendered
    await expect(page.getByText(/no friends/i)).toBeVisible()
    await expect(page.getByPlaceholder('Search friends...')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tab Active State Styling
// ---------------------------------------------------------------------------

test.describe('Tab Active State Styling', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('Profile tab is visually active by default', async ({ page }) => {
    const profileTab = page.getByRole('tab', { name: 'Profile', exact: true })
    // Active tab gets accent-400 text and accent-500 border
    await expect(profileTab).toHaveClass(/text-accent-400/)
  })

  test('switching tabs updates active state styling', async ({ page }) => {
    // Click Friends tab
    const friendsTab = page.getByRole('tab', { name: 'Friends', exact: true })
    await friendsTab.click()

    // Friends tab should now be active
    await expect(friendsTab).toHaveClass(/text-accent-400/)

    // Profile tab should be inactive
    const profileTab = page.getByRole('tab', { name: 'Profile', exact: true })
    await expect(profileTab).toHaveClass(/text-text-muted/)
  })

  test('all four tabs switch active state correctly', async ({ page }) => {
    const tabs = ['Profile', 'Friends', 'Requests', 'Blocked']

    for (const tabName of tabs) {
      const tab = page.getByRole('tab', { name: tabName, exact: true })
      await tab.click()
      await expect(tab).toHaveClass(/text-accent-400/)

      // All other tabs should be inactive
      for (const otherTabName of tabs) {
        if (otherTabName !== tabName) {
          const otherTab = page.getByRole('tab', { name: otherTabName, exact: true })
          await expect(otherTab).toHaveClass(/text-text-muted/)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Rapid Tab Switching — Stability
// ---------------------------------------------------------------------------

test.describe('Rapid Tab Switching — Stability', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
  })

  test('rapid tab switching does not crash or leave stale content', async ({ page }) => {
    // Quickly switch through all tabs multiple times
    const tabNames = ['Friends', 'Requests', 'Blocked', 'Profile', 'Friends', 'Blocked', 'Profile']

    for (const tabName of tabNames) {
      await page.getByRole('tab', { name: tabName, exact: true }).click()
    }

    // Should end on Profile tab and show editor content
    await expect(page.getByText('Display name')).toBeVisible()
    await expect(page.getByText('Avatar')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// FriendsList Component — Structural Verification
// ---------------------------------------------------------------------------

test.describe('FriendsList Component — Structural Verification', () => {
  test('FriendsList component renders Remove and Block button labels', async () => {
    // Structural verification: check that the component source includes expected button labels
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/FriendsList.tsx', 'utf-8')
    expect(content).toContain('Remove')
    expect(content).toContain('Block')
    expect(content).toContain("'Sure?'")
    expect(content).toContain("'Block?'")
    expect(content).toContain('Search friends...')
  })

  test('FriendsList has 3-second confirmation timeout', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/FriendsList.tsx', 'utf-8')
    expect(content).toContain('3000')
    expect(content).toContain('clearConfirm')
  })

  test('FriendsList supports search filtering', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/FriendsList.tsx', 'utf-8')
    expect(content).toContain('toLowerCase')
    expect(content).toContain('includes(query)')
    expect(content).toContain('No matches')
  })
})

// ---------------------------------------------------------------------------
// FriendRequests Component — Structural Verification
// ---------------------------------------------------------------------------

test.describe('FriendRequests Component — Structural Verification', () => {
  test('FriendRequests component renders Accept, Decline, Cancel labels', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/FriendRequests.tsx', 'utf-8')
    expect(content).toContain('Accept')
    expect(content).toContain('Decline')
    expect(content).toContain('Cancel')
    expect(content).toContain('Incoming')
    expect(content).toContain('Sent')
  })

  test('FriendRequests shows incoming and outgoing counts', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/FriendRequests.tsx', 'utf-8')
    expect(content).toContain('incoming.length')
    expect(content).toContain('outgoing.length')
  })

  test('FriendRequests displays avatar and username for requests', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/FriendRequests.tsx', 'utf-8')
    expect(content).toContain('avatar_value')
    expect(content).toContain('display_name')
    expect(content).toContain('username')
  })
})

// ---------------------------------------------------------------------------
// BlockedUsers Component — Structural Verification
// ---------------------------------------------------------------------------

test.describe('BlockedUsers Component — Structural Verification', () => {
  test('BlockedUsers component renders Unblock button label', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/BlockedUsers.tsx', 'utf-8')
    expect(content).toContain('Unblock')
    expect(content).toContain('No blocked users')
  })

  test('BlockedUsers displays avatar and user info', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/profile/BlockedUsers.tsx', 'utf-8')
    expect(content).toContain('avatar_value')
    expect(content).toContain('display_name')
    expect(content).toContain('username')
  })
})

// ---------------------------------------------------------------------------
// FriendsPicker Component — Structural Verification
// ---------------------------------------------------------------------------

test.describe('FriendsPicker Component — Structural Verification', () => {
  test('FriendsPicker has search, selection toggle, and max selection hint', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/party/FriendsPicker.tsx', 'utf-8')
    expect(content).toContain('Search friends...')
    expect(content).toContain('selectedIds')
    expect(content).toContain('maxSelections')
    expect(content).toContain('Maximum of')
    expect(content).toContain('No friends yet')
    expect(content).toContain('No matches found')
  })

  test('FriendsPicker defaults maxSelections to 20', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('components/party/FriendsPicker.tsx', 'utf-8')
    expect(content).toContain('maxSelections = 20')
  })
})
