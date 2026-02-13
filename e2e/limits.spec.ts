import { test, expect, type Page } from '@playwright/test'

/**
 * Free-Tier Abuse Prevention Limits — E2E Tests
 *
 * These tests verify server-side enforcement of:
 * - 5 active parties per session
 * - 20 members per party
 * - 20 images per party
 * - Password-protected party join flow (+ deep link)
 *
 * REQUIRES a real Supabase instance (local or CI). Skipped in mock mode.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder')

const FAKE_AUTH_COOKIE = { name: 'sb-mock-auth-token', value: 'test-session', domain: 'localhost', path: '/' }

// Unique prefix per run to avoid collisions between parallel shards
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// ---------------------------------------------------------------------------
// API helpers — call server routes directly to set up preconditions quickly
// ---------------------------------------------------------------------------

async function apiCreateParty(
  baseURL: string,
  sessionId: string,
  displayName: string,
  options: Record<string, unknown> = {},
) {
  const res = await fetch(`${baseURL}/api/parties/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, displayName, avatar: '🎉', ...options }),
  })
  return { status: res.status, body: await res.json() }
}

async function apiJoinParty(
  baseURL: string,
  code: string,
  sessionId: string,
  displayName: string,
  options: Record<string, unknown> = {},
) {
  const res = await fetch(`${baseURL}/api/parties/join/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, sessionId, displayName, avatar: '🎉', ...options }),
  })
  return { status: res.status, body: await res.json() }
}

async function apiAddImage(baseURL: string, partyId: string, sessionId: string, index: number) {
  const res = await fetch(`${baseURL}/api/queue/items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function resetSession(page: Page): Promise<void> {
  await page.context().addCookies([FAKE_AUTH_COOKIE])
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

// ---------------------------------------------------------------------------
// 5-party limit
// ---------------------------------------------------------------------------

test.describe('Limit: 5 active parties per session', () => {
  test.beforeEach(async () => {
    test.skip(isMockMode, 'Requires real Supabase — skipped in mock mode')
  })

  test('rejects 6th party creation with error message', async ({ page, baseURL }) => {
    const sessionId = `5party-${runId}`

    for (let i = 1; i <= 5; i++) {
      const { body } = await apiCreateParty(baseURL!, sessionId, `Host ${i}`)
      expect(body.success, `Party ${i} should be created successfully`).toBe(true)
    }

    await resetSession(page)
    await page.evaluate((sid) => localStorage.setItem('link-party-session-id', sid), sessionId)
    await page.reload()

    await page.getByRole('link', { name: 'Start a Party' }).first().click()
    await page.getByRole('button', { name: 'Create Party' }).click()

    await expect(page.getByText(/at most 5 active parties/i)).toBeVisible({ timeout: 10000 })
  })

  test('6th party rejected via API returns 409', async ({ baseURL }) => {
    const sessionId = `5party-api-${runId}`

    for (let i = 1; i <= 5; i++) {
      const { body } = await apiCreateParty(baseURL!, sessionId, `Host ${i}`)
      expect(body.success).toBe(true)
    }

    const { status, body } = await apiCreateParty(baseURL!, sessionId, 'Host 6')
    expect(status).toBe(409)
    expect(body.error).toContain('at most 5 active parties')
  })
})

// ---------------------------------------------------------------------------
// 20-member limit
// ---------------------------------------------------------------------------

test.describe('Limit: 20 members per party', () => {
  test.beforeEach(async () => {
    test.skip(isMockMode, 'Requires real Supabase — skipped in mock mode')
  })

  test('rejects 21st member with error message in UI', async ({ page, baseURL }) => {
    const hostSession = `20mem-host-${runId}`
    const { body: createResult } = await apiCreateParty(baseURL!, hostSession, 'LimitHost')
    expect(createResult.success).toBe(true)
    const partyCode = createResult.party.code

    for (let i = 1; i <= 19; i++) {
      const { body } = await apiJoinParty(baseURL!, partyCode, `20mem-g-${runId}-${i}`, `Guest ${i}`)
      expect(body.success, `Guest ${i} should join successfully`).toBe(true)
    }

    await resetSession(page)
    await page.getByRole('link', { name: 'Join with Code' }).click()
    await page.getByPlaceholder('ABC123').fill(partyCode)
    await page.getByRole('button', { name: 'Join Party' }).click()

    await expect(page.getByText(/party is full/i)).toBeVisible({ timeout: 10000 })
  })

  test('allows re-join when party is full', async ({ baseURL }) => {
    const hostSession = `20mem-rejoin-${runId}`
    const { body: createResult } = await apiCreateParty(baseURL!, hostSession, 'RejoinHost')
    expect(createResult.success).toBe(true)
    const partyCode = createResult.party.code

    for (let i = 1; i <= 19; i++) {
      const { body } = await apiJoinParty(baseURL!, partyCode, `20mem-rj-${runId}-${i}`, `Guest ${i}`)
      expect(body.success).toBe(true)
    }

    const { status, body } = await apiJoinParty(baseURL!, partyCode, `20mem-rj-${runId}-1`, 'Guest 1 Again')
    expect(status).toBe(200)
    expect(body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 20-image limit
// ---------------------------------------------------------------------------

test.describe('Limit: 20 images per party', () => {
  test.beforeEach(async () => {
    test.skip(isMockMode, 'Requires real Supabase — skipped in mock mode')
  })

  test('rejects 21st image but allows non-image items', async ({ baseURL }) => {
    const { body: createResult } = await apiCreateParty(baseURL!, `20img-${runId}`, 'ImageHost')
    expect(createResult.success).toBe(true)
    const partyId = createResult.party.id

    // 2 sessions to stay under 10/min rate limit per session
    for (let i = 1; i <= 10; i++) {
      const { body } = await apiAddImage(baseURL!, partyId, `img-a-${runId}`, i)
      expect(body.success, `Image ${i} should be added`).toBe(true)
    }
    for (let i = 11; i <= 20; i++) {
      const { body } = await apiAddImage(baseURL!, partyId, `img-b-${runId}`, i)
      expect(body.success, `Image ${i} should be added`).toBe(true)
    }

    const { status, body } = await apiAddImage(baseURL!, partyId, `img-c-${runId}`, 21)
    expect(status).toBe(400)
    expect(body.error).toContain('image limit')

    const noteRes = await fetch(`${baseURL}/api/queue/items/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyId,
        sessionId: `img-note-${runId}`,
        type: 'note',
        status: 'pending',
        position: 21,
        addedByName: 'NoteBot',
        noteContent: 'Notes bypass image limit',
      }),
    })
    const noteBody = await noteRes.json()
    expect(noteBody.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Password-protected party
// ---------------------------------------------------------------------------

test.describe('Limit: Password-protected party join', () => {
  test.beforeEach(async () => {
    test.skip(isMockMode, 'Requires real Supabase — skipped in mock mode')
  })

  test('prompts for password, rejects wrong, accepts correct', async ({ page, baseURL }) => {
    const { body: createResult } = await apiCreateParty(baseURL!, `pw-${runId}`, 'PWHost', {
      password: 'secret42',
      partyName: 'Private Party',
    })
    expect(createResult.success).toBe(true)
    const partyCode = createResult.party.code

    await resetSession(page)
    await page.getByRole('link', { name: 'Join with Code' }).click()
    await page.getByPlaceholder('ABC123').fill(partyCode)
    await page.getByRole('button', { name: 'Join Party' }).click()

    await expect(page.getByPlaceholder(/enter party password/i)).toBeVisible({ timeout: 10000 })

    await page.getByPlaceholder(/enter party password/i).fill('wrongpass')
    await page.getByRole('button', { name: 'Join Party' }).click()
    await expect(page.getByText(/incorrect party password/i)).toBeVisible({ timeout: 10000 })

    await page.getByPlaceholder(/enter party password/i).fill('secret42')
    await page.getByRole('button', { name: 'Join Party' }).click()
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })

  test('deep link join with password-protected party', async ({ page, baseURL }) => {
    const { body: createResult } = await apiCreateParty(baseURL!, `pw-deep-${runId}`, 'DeepHost', {
      password: 'deep123',
    })
    expect(createResult.success).toBe(true)
    const partyCode = createResult.party.code

    await page.context().addCookies([FAKE_AUTH_COOKIE])
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto(`/join/${partyCode}`)

    await expect(page.getByRole('textbox', { name: 'ABC123' })).toHaveValue(partyCode)

    await page.getByRole('button', { name: 'Join Party' }).click()
    await expect(page.getByPlaceholder(/enter party password/i)).toBeVisible({ timeout: 10000 })

    await page.getByPlaceholder(/enter party password/i).fill('deep123')
    await page.getByRole('button', { name: 'Join Party' }).click()
    await expect(page.getByTestId('party-code')).toBeVisible({ timeout: 10000 })
  })
})
