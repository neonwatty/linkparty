import { test, expect } from '@playwright/test'

/**
 * Profile Component Source Verification
 *
 * Pure Node.js file system checks — no browser interaction required.
 * Verifies component source files contain expected patterns.
 */

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
