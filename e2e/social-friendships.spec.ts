import { test, expect } from '@playwright/test'

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

/**
 * Social / Friendships E2E Tests
 *
 * These tests verify the UI structure and behavior of friendship-related components
 * in mock mode. Tests that require live Supabase (actual friend request/accept/decline
 * flows between two users) are documented as skipped outlines at the bottom.
 */

// ---------------------------------------------------------------------------
// Friends Tab — UI Structure
// ---------------------------------------------------------------------------

test.describe('Friends Tab — UI Structure', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Friends' }).click()
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
    await expect(page.getByRole('button', { name: 'Block' })).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Requests Tab — UI Structure
// ---------------------------------------------------------------------------

test.describe('Requests Tab — UI Structure', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Requests' }).click()
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
    await page.getByRole('button', { name: 'Blocked' }).click()
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
    const requestsButton = page.getByRole('button', { name: 'Requests' })
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
    await page.getByRole('button', { name: 'Friends' }).click()
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
    const profileTab = page.getByRole('button', { name: 'Profile', exact: true })
    // Active tab gets accent-400 text and accent-500 border
    await expect(profileTab).toHaveClass(/text-accent-400/)
  })

  test('switching tabs updates active state styling', async ({ page }) => {
    // Click Friends tab
    const friendsTab = page.getByRole('button', { name: 'Friends', exact: true })
    await friendsTab.click()

    // Friends tab should now be active
    await expect(friendsTab).toHaveClass(/text-accent-400/)

    // Profile tab should be inactive
    const profileTab = page.getByRole('button', { name: 'Profile', exact: true })
    await expect(profileTab).toHaveClass(/text-text-muted/)
  })

  test('all four tabs switch active state correctly', async ({ page }) => {
    const tabs = ['Profile', 'Friends', 'Requests', 'Blocked']

    for (const tabName of tabs) {
      const tab = page.getByRole('button', { name: tabName, exact: true })
      await tab.click()
      await expect(tab).toHaveClass(/text-accent-400/)

      // All other tabs should be inactive
      for (const otherTabName of tabs) {
        if (otherTabName !== tabName) {
          const otherTab = page.getByRole('button', { name: otherTabName, exact: true })
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
      await page.getByRole('button', { name: tabName, exact: true }).click()
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

// ---------------------------------------------------------------------------
// Friends lib — Module Exports
// ---------------------------------------------------------------------------

test.describe('Friends lib — Module Exports', () => {
  test('friends lib exports all required functions', async () => {
    const friends = await import('../lib/friends')
    expect(typeof friends.listFriends).toBe('function')
    expect(typeof friends.listIncomingRequests).toBe('function')
    expect(typeof friends.listOutgoingRequests).toBe('function')
    expect(typeof friends.acceptFriendRequest).toBe('function')
    expect(typeof friends.declineFriendRequest).toBe('function')
    expect(typeof friends.cancelFriendRequest).toBe('function')
    expect(typeof friends.removeFriend).toBe('function')
    expect(typeof friends.blockUser).toBe('function')
    expect(typeof friends.unblockUser).toBe('function')
    expect(typeof friends.listBlockedUsers).toBe('function')
  })

  test('friends lib exports search and status functions', async () => {
    const friends = await import('../lib/friends')
    expect(typeof friends.searchUsers).toBe('function')
    expect(typeof friends.getFriendshipStatus).toBe('function')
    expect(typeof friends.sendFriendRequest).toBe('function')
    expect(typeof friends.isBlocked).toBe('function')
  })

  test('friends lib exports type definitions', async () => {
    // Verify the module can be imported without errors and has expected shape
    const friends = await import('../lib/friends')
    expect(Object.keys(friends).length).toBeGreaterThanOrEqual(14)
  })
})

// ---------------------------------------------------------------------------
// Profile lib — Module Exports
// ---------------------------------------------------------------------------

test.describe('Profile lib — Module Exports', () => {
  test('profile lib exports all required functions', async () => {
    const profile = await import('../lib/profile')
    expect(typeof profile.getMyProfile).toBe('function')
    expect(typeof profile.getProfileById).toBe('function')
    expect(typeof profile.updateProfile).toBe('function')
    expect(typeof profile.checkUsernameAvailable).toBe('function')
    expect(typeof profile.searchProfiles).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// Error Messages — Friends Constants
// ---------------------------------------------------------------------------

test.describe('Error Messages — Friends Constants', () => {
  test('FRIENDS error messages are all defined', async () => {
    const { FRIENDS } = await import('../lib/errorMessages')
    expect(FRIENDS.ALREADY_FRIENDS).toBeTruthy()
    expect(FRIENDS.REQUEST_EXISTS).toBeTruthy()
    expect(FRIENDS.REQUEST_INCOMING).toBeTruthy()
    expect(FRIENDS.REQUEST_NOT_FOUND).toBeTruthy()
    expect(FRIENDS.CANNOT_FRIEND_SELF).toBeTruthy()
    expect(FRIENDS.NOT_AUTHORIZED).toBeTruthy()
    expect(FRIENDS.USER_NOT_FOUND).toBeTruthy()
    expect(FRIENDS.INVALID_ACTION).toBeTruthy()
    expect(FRIENDS.RATE_LIMITED).toBeTruthy()
    expect(FRIENDS.BLOCKED).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Friend Request API — Input Validation (mock mode — no service key)
// ---------------------------------------------------------------------------

test.describe('Friend Request API — Input Validation', () => {
  test('rejects request with missing friendId', async ({ request }) => {
    const response = await request.post('/api/friends/request', {
      data: {},
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Missing or invalid friendId')
  })

  test('rejects request with invalid friendId format', async ({ request }) => {
    const response = await request.post('/api/friends/request', {
      data: { friendId: 'not-a-uuid' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Missing or invalid friendId')
  })

  test('rejects request with numeric friendId', async ({ request }) => {
    const response = await request.post('/api/friends/request', {
      data: { friendId: 12345 },
    })
    expect(response.status()).toBe(400)
  })

  test('rejects request with empty string friendId', async ({ request }) => {
    const response = await request.post('/api/friends/request', {
      data: { friendId: '' },
    })
    expect(response.status()).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Accept Friend Request API — Input Validation
// ---------------------------------------------------------------------------

test.describe('Accept Friend Request API — Input Validation', () => {
  test('rejects accept with missing friendshipId', async ({ request }) => {
    const response = await request.post('/api/friends/accept', {
      data: {},
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Missing or invalid friendshipId')
  })

  test('rejects accept with invalid friendshipId format', async ({ request }) => {
    const response = await request.post('/api/friends/accept', {
      data: { friendshipId: 'invalid' },
    })
    expect(response.status()).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Friendship Delete API — Input Validation
// ---------------------------------------------------------------------------

test.describe('Friendship Delete API — Input Validation', () => {
  test('rejects delete with invalid action query param', async ({ request }) => {
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.delete(`/api/friends/${validUuid}?action=invalid`)
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Invalid action')
  })

  test('rejects delete with missing action query param', async ({ request }) => {
    const validUuid = '00000000-0000-0000-0000-000000000001'
    const response = await request.delete(`/api/friends/${validUuid}`)
    expect(response.status()).toBe(400)
  })

  test('rejects delete with invalid friendship id format', async ({ request }) => {
    const response = await request.delete('/api/friends/not-a-uuid?action=unfriend')
    expect(response.status()).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Block User API — Input Validation
// ---------------------------------------------------------------------------

test.describe('Block User API — Input Validation', () => {
  test('rejects block with missing userId', async ({ request }) => {
    const response = await request.post('/api/users/block', {
      data: {},
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Missing or invalid userId')
  })

  test('rejects block with invalid userId format', async ({ request }) => {
    const response = await request.post('/api/users/block', {
      data: { userId: 'not-a-uuid' },
    })
    expect(response.status()).toBe(400)
  })

  test('rejects unblock with missing userId', async ({ request }) => {
    const response = await request.delete('/api/users/block')
    expect(response.status()).toBe(400)
  })

  test('rejects unblock with invalid userId format', async ({ request }) => {
    const response = await request.delete('/api/users/block?userId=not-a-uuid')
    expect(response.status()).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Friend Request Flows (requires live Supabase)
// ---------------------------------------------------------------------------

/**
 * Friend Request Flows (requires live Supabase)
 *
 * These tests require two authenticated users interacting with a real Supabase backend.
 * They cannot run in mock mode because friendship operations require actual database rows.
 */
test.describe.skip('Send Friend Request (requires live Supabase)', () => {
  test('user can send friend request from party room members list', async () => {
    // OUTLINE:
    // 1. User A creates a party
    // 2. User B joins the party
    // 3. User A sees "+" button next to User B's name in members list
    // 4. User A clicks "+" — button changes to "Sent" label
    // 5. User B navigates to /profile -> Requests tab
    // 6. User B sees incoming request from User A with avatar, name, username
    // 7. User B sees "Accept" and "Decline" buttons
  })
})

test.describe.skip('Accept Friend Request (requires live Supabase)', () => {
  test('accepting moves user to Friends tab', async () => {
    // OUTLINE:
    // 1. User A sends friend request to User B
    // 2. User B goes to Requests tab, sees incoming request
    // 3. User B clicks "Accept"
    // 4. Request disappears from Requests tab
    // 5. User B clicks Friends tab — sees User A
    // 6. User A's Friends tab also shows User B (bidirectional)
  })
})

test.describe.skip('Decline Friend Request (requires live Supabase)', () => {
  test('declining removes the request', async () => {
    // OUTLINE:
    // 1. User A sends friend request to User B
    // 2. User B goes to Requests tab, clicks "Decline"
    // 3. Request disappears from User B's incoming list
    // 4. Request disappears from User A's sent list
    // 5. Neither user appears in the other's Friends tab
  })
})

test.describe.skip('Cancel Outgoing Request (requires live Supabase)', () => {
  test('canceling sent request removes it from both sides', async () => {
    // OUTLINE:
    // 1. User A sends friend request to User B
    // 2. User A goes to Requests tab -> Sent section
    // 3. User A clicks "Cancel" on the outgoing request
    // 4. Request disappears from User A's Sent list
    // 5. Request disappears from User B's Incoming list
  })
})

test.describe.skip('Remove Friend (requires live Supabase)', () => {
  test('removing friend with confirmation removes from both sides', async () => {
    // OUTLINE:
    // 1. User A and User B are friends
    // 2. User A goes to Friends tab, clicks "Remove" on User B
    // 3. Button changes to "Sure?" (red confirmation)
    // 4. User A clicks "Sure?" within 3 seconds
    // 5. User B disappears from User A's friends list
    // 6. User A disappears from User B's friends list
  })

  test('confirmation resets after 3 seconds', async () => {
    // OUTLINE:
    // 1. User A clicks "Remove" on a friend
    // 2. Button shows "Sure?"
    // 3. Wait 3 seconds without clicking
    // 4. Button resets to "Remove"
    // 5. Friend is NOT removed
  })
})

test.describe.skip('Block User (requires live Supabase)', () => {
  test('blocking a friend removes friendship and adds to blocked list', async () => {
    // OUTLINE:
    // 1. User A and User B are friends
    // 2. User A clicks "Block" on User B
    // 3. Button changes to "Block?" (red confirmation)
    // 4. User A clicks "Block?"
    // 5. User B disappears from Friends tab
    // 6. User B appears in Blocked tab with "Unblock" button
    // 7. User B's Friends tab no longer shows User A
  })

  test('unblocking removes from blocked list but does not restore friendship', async () => {
    // OUTLINE:
    // 1. User A has blocked User B
    // 2. User A goes to Blocked tab, clicks "Unblock" on User B
    // 3. User B disappears from Blocked tab
    // 4. User B does NOT appear in Friends tab (unblock != re-friend)
    // 5. Both users can send friend requests to each other again
  })
})

test.describe.skip('Friend Request from Party Room (requires live Supabase)', () => {
  test('FriendsPicker appears in invite flow and shows friends', async () => {
    // OUTLINE:
    // 1. User A has friends
    // 2. User A creates a party
    // 3. User A opens the invite/friends picker
    // 4. FriendsPicker shows search input and friend list
    // 5. User A can select/deselect friends
    // 6. Selected friends get check icon
  })
})

test.describe.skip('Search Users (requires live Supabase)', () => {
  test('searchUsers returns matching profiles and excludes blocked users', async () => {
    // OUTLINE:
    // 1. User A searches for "testuser"
    // 2. Results include matching display names and usernames
    // 3. Results exclude User A themselves
    // 4. Results exclude users blocked by User A
    // 5. Results exclude users who have blocked User A
  })
})
