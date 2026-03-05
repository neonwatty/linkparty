import { test, expect } from '@playwright/test'

/**
 * Friends API E2E Tests — Input Validation
 *
 * These tests verify API input validation for friendship endpoints in mock mode.
 * No authentication or live Supabase is required — they test request/response validation only.
 */

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
