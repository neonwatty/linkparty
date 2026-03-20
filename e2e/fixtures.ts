/**
 * Shared E2E Test Fixtures
 *
 * Constants, helpers, and API utilities shared across multi-user test files.
 * Eliminates copy-paste between multi-user-realtime, limits, and social tests.
 */

import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

export const TEST_USERS = {
  alice: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'alice@test.local',
    password: 'testpassword1',
    username: 'alice',
    displayName: 'Alice Test',
  },
  bob: {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'bob@test.local',
    password: 'testpassword2',
    username: 'bob',
    displayName: 'Bob Test',
  },
  carol: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'carol@test.local',
    password: 'testpassword3',
    username: 'carol',
    displayName: 'Carol Test',
  },
} as const

// ---------------------------------------------------------------------------
// Skip-condition helpers
// ---------------------------------------------------------------------------

export function shouldSkipLive(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder')
  return isMockMode || !process.env.SUPABASE_LIVE
}

export function isMockMode(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return !supabaseUrl || supabaseUrl.includes('placeholder')
}

// ---------------------------------------------------------------------------
// Browser context helpers
// ---------------------------------------------------------------------------

export async function createUserContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()
  await context.addCookies([FAKE_AUTH_COOKIE])
  return context
}

// ---------------------------------------------------------------------------
// UI helpers — mock mode (session-based, no real auth)
// ---------------------------------------------------------------------------

export async function resetSession(page: Page, displayName = 'Test User'): Promise<void> {
  await page.goto('/')
  await page.evaluate((name) => {
    localStorage.clear()
    localStorage.setItem('link-party-display-name', name)
    localStorage.setItem('lp-cookie-consent', 'declined')
  }, displayName)
  await page.reload()
}

export async function createPartyAsHost(page: Page): Promise<string> {
  await resetSession(page)
  await page.getByRole('link', { name: 'Start a Party' }).first().click()
  await page.getByRole('button', { name: 'Create Party' }).click()
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  const codeText = (await page.getByTestId('party-code').textContent())?.trim() || ''
  return codeText
}

export async function joinPartyAsGuest(page: Page, _displayName: string, partyCode: string): Promise<void> {
  await resetSession(page)
  await page.getByRole('link', { name: 'Join with Code' }).click()
  await page.getByPlaceholder('ABC123').fill(partyCode)
  await page.getByRole('button', { name: 'Join Party' }).click()
  await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
}

export async function addNote(page: Page, text: string): Promise<void> {
  await page.locator('.fab').click()
  await page.getByRole('button', { name: 'Write a note' }).click()
  await page.getByPlaceholder('Share a thought, reminder, or message...').fill(text)
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Add to Queue' }).click()
  await page.waitForTimeout(1000)
}

export async function addYouTubeLink(page: Page, url: string): Promise<void> {
  await page.locator('.fab').click()
  await page.getByPlaceholder('YouTube, Twitter/X, or Reddit URL...').fill(url)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('button', { name: 'Add to Queue' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'Add to Queue' }).click()
  await page.waitForTimeout(1000)
}

// ---------------------------------------------------------------------------
// UI helpers — real auth (login via page)
// ---------------------------------------------------------------------------

export async function dismissOfflineBanner(page: Page): Promise<void> {
  await page.evaluate(() => {
    const banner = document.querySelector('.fixed.top-0.bg-amber-500')
    if (banner) (banner as HTMLElement).style.display = 'none'
  })
}

export async function loginViaPage(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByPlaceholder('Email address').fill(email)
  await page.getByPlaceholder('Password').fill(password)

  const [authResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('token?grant_type=password'), { timeout: 15000 }),
    page.getByRole('button', { name: 'Sign In' }).click(),
  ])
  expect(authResponse.status()).toBe(200)

  await page.waitForURL('/', { timeout: 15000 })
  await expect(page.getByRole('link', { name: 'Start a Party' }).first()).toBeVisible({ timeout: 15000 })
  await dismissOfflineBanner(page)
}

/** Get an access token for a test user via REST API (Supabase SSR stores sessions in cookies, not localStorage) */
export async function getAccessToken(email: string, password: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const { access_token } = await loginViaAPI(url, key, email, password)
  return access_token
}

// ---------------------------------------------------------------------------
// API helpers — login via REST (no browser needed)
// ---------------------------------------------------------------------------

export async function loginViaAPI(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string; user: { id: string } }> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// API helpers — party operations (session-based, no auth token needed)
// ---------------------------------------------------------------------------

export async function apiCreateParty(
  baseURL: string,
  sessionId: string,
  displayName: string,
  options: Record<string, unknown> = {},
) {
  const { accessToken, ...bodyOptions } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json', origin: 'http://localhost:3000' }
  if (typeof accessToken === 'string') {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  const res = await fetch(`${baseURL}/api/parties/create/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, displayName, avatar: '🎉', ...bodyOptions }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiJoinParty(
  baseURL: string,
  code: string,
  sessionId: string,
  displayName: string,
  options: Record<string, unknown> = {},
) {
  const res = await fetch(`${baseURL}/api/parties/join/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({ code, sessionId, displayName, avatar: '🎉', ...options }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiAddImage(baseURL: string, partyId: string, sessionId: string, index: number) {
  const res = await fetch(`${baseURL}/api/queue/items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({
      partyId,
      sessionId,
      type: 'image',
      status: 'pending',
      position: index,
      addedByName: 'ImageBot',
      imageUrl: `https://picsum.photos/id/${index}/400/300`,
      imageName: `test-${index}.jpg`,
    }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiAddNote(
  baseURL: string,
  partyId: string,
  sessionId: string,
  noteContent: string,
  position: number,
) {
  const res = await fetch(`${baseURL}/api/queue/items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({
      partyId,
      sessionId,
      type: 'note',
      status: 'pending',
      position,
      addedByName: 'NoteBot',
      noteContent,
    }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiDeleteItem(baseURL: string, itemId: string, partyId: string, sessionId: string) {
  const res = await fetch(`${baseURL}/api/queue/items/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({ itemId, partyId, sessionId }),
  })
  return { status: res.status, body: await res.json() }
}

// ---------------------------------------------------------------------------
// API helpers — social operations (require Bearer access_token)
// ---------------------------------------------------------------------------

export async function apiSendFriendRequest(baseURL: string, accessToken: string, friendId: string) {
  const res = await fetch(`${baseURL}/api/friends/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ friendId }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiAcceptFriendRequest(baseURL: string, accessToken: string, friendshipId: string) {
  const res = await fetch(`${baseURL}/api/friends/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ friendshipId }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiBlockUser(baseURL: string, accessToken: string, userId: string) {
  const res = await fetch(`${baseURL}/api/users/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ userId }),
  })
  return { status: res.status, body: await res.json() }
}

export async function apiUnblockUser(baseURL: string, accessToken: string, userId: string) {
  const res = await fetch(`${baseURL}/api/users/block?userId=${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
  })
  return { status: res.status, body: await res.json() }
}

export async function apiRemoveFriend(baseURL: string, accessToken: string, friendshipId: string) {
  const res = await fetch(`${baseURL}/api/friends/${friendshipId}?action=unfriend`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
  })
  return { status: res.status, body: await res.json() }
}

export async function apiDeclineFriendRequest(baseURL: string, accessToken: string, friendshipId: string) {
  const res = await fetch(`${baseURL}/api/friends/${friendshipId}?action=decline`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
  })
  return { status: res.status, body: await res.json() }
}

export async function apiInviteFriends(
  baseURL: string,
  accessToken: string,
  partyId: string,
  partyCode: string,
  partyName: string,
  friendIds: string[],
) {
  const res = await fetch(`${baseURL}/api/parties/invite-friends`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ partyId, partyCode, partyName, friendIds }),
  })
  return { status: res.status, body: await res.json() }
}

// ---------------------------------------------------------------------------
// Cleanup helpers — remove social state between tests
// ---------------------------------------------------------------------------

/** Delete all friendships, blocks, parties, and notifications for test users via service role */
export async function cleanupSocialState(supabaseUrl: string, serviceRoleKey: string, userIds: string[]) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: 'return=minimal',
  }

  // Delete friendships involving any of the test users
  for (const userId of userIds) {
    await fetch(`${supabaseUrl}/rest/v1/friendships?or=(user_id.eq.${userId},friend_id.eq.${userId})`, {
      method: 'DELETE',
      headers,
    })
  }

  // Delete blocks involving any of the test users
  for (const userId of userIds) {
    await fetch(`${supabaseUrl}/rest/v1/user_blocks?or=(blocker_id.eq.${userId},blocked_id.eq.${userId})`, {
      method: 'DELETE',
      headers,
    })
  }

  // Delete party_members and parties created by test users (via user_id on party_members)
  for (const userId of userIds) {
    // Find party IDs where this user is a member
    const partyRes = await fetch(`${supabaseUrl}/rest/v1/party_members?user_id=eq.${userId}&select=party_id`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    const partyMembers = (await partyRes.json()) as { party_id: string }[]
    for (const pm of partyMembers || []) {
      // Delete queue items, party members, then party
      await fetch(`${supabaseUrl}/rest/v1/queue_items?party_id=eq.${pm.party_id}`, { method: 'DELETE', headers })
      await fetch(`${supabaseUrl}/rest/v1/party_members?party_id=eq.${pm.party_id}`, { method: 'DELETE', headers })
      await fetch(`${supabaseUrl}/rest/v1/parties?id=eq.${pm.party_id}`, { method: 'DELETE', headers })
    }
  }

  // Delete notifications for test users
  for (const userId of userIds) {
    await fetch(`${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}`, { method: 'DELETE', headers })
  }
}
