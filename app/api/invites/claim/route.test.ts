import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

// Terminal mocks
const mockInviteTokensQueryLimit = vi.fn()
const mockFriendshipCheckMaybeSingle = vi.fn()
const mockFriendshipUpsert = vi.fn()
const mockNotificationInsert = vi.fn()
const mockTokenUpdateIn = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string

      if (table === 'invite_tokens') {
        // Supports both select-chain and update-chain on the same object
        return {
          // Select chain: .select(...).eq().eq().gt().limit(10)
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  eq: vi.fn().mockReturnThis(),
                  limit: mockInviteTokensQueryLimit,
                })),
              })),
            })),
          })),
          // Update chain: .update({...}).in('id', ids)
          update: vi.fn(() => ({
            in: mockTokenUpdateIn,
          })),
        }
      }
      if (table === 'friendships') {
        return {
          // Check chain: .select('id').eq().eq().maybeSingle()
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: mockFriendshipCheckMaybeSingle,
              })),
            })),
          })),
          // Upsert chain: .upsert(rows, options)
          upsert: mockFriendshipUpsert,
        }
      }
      if (table === 'notifications') {
        return {
          insert: mockNotificationInsert,
        }
      }
      return {}
    },
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

const originalEnv = process.env

const createRequest = (body: object = {}, includeAuth = true) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', origin: 'http://localhost:3000' }
  if (includeAuth) headers['Authorization'] = 'Bearer test-token'
  return new NextRequest('http://localhost:3000/api/invites/claim', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('Invites Claim API', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          user_metadata: { display_name: 'Test User' },
        },
      },
      error: null,
    })
    mockInviteTokensQueryLimit.mockResolvedValue({
      data: [{ id: 'tok-1', inviter_id: 'inviter-456', party_code: 'ABC123' }],
      error: null,
    })
    mockFriendshipCheckMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockFriendshipUpsert.mockResolvedValue({ error: null })
    mockNotificationInsert.mockResolvedValue({ error: null })
    mockTokenUpdateIn.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({}, false))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when Supabase env vars are missing', async () => {
      process.env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when origin is invalid', async () => {
      const { validateOrigin } = await import('@/lib/csrf')
      ;(validateOrigin as Mock).mockReturnValueOnce(false)
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('No Pending Invites', () => {
    it('returns claimed=0 when no matching tokens exist', async () => {
      mockInviteTokensQueryLimit.mockResolvedValueOnce({ data: [], error: null })
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.claimed).toBe(0)
      expect(body.friendshipsCreated).toBe(0)
    })

    it('returns claimed=0 when token query errors', async () => {
      mockInviteTokensQueryLimit.mockResolvedValueOnce({ data: null, error: { message: 'db error' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.claimed).toBe(0)
    })
  })

  describe('Successful Claim', () => {
    it('claims invites and creates mutual friendships', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyCode: 'ABC123' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.claimed).toBe(1)
      expect(body.friendshipsCreated).toBe(1)
    })

    it('skips self-invites (inviter_id === user.id)', async () => {
      mockInviteTokensQueryLimit.mockResolvedValueOnce({
        data: [{ id: 'tok-self', inviter_id: 'user-123', party_code: 'ABC123' }],
        error: null,
      })
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      // Self-invite token is still added to claimedTokenIds but no friendship created
      expect(body.friendshipsCreated).toBe(0)
    })

    it('skips friendship creation when friendship already exists in both directions', async () => {
      mockFriendshipCheckMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-1' }, error: null })
      mockFriendshipCheckMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-2' }, error: null })
      const { POST } = await import('./route')
      const response = await POST(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.claimed).toBe(1)
      expect(body.friendshipsCreated).toBe(0)
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 after exceeding 10 requests per minute', async () => {
      const { POST } = await import('./route')
      // Make 10 successful requests
      for (let i = 0; i < 10; i++) {
        const res = await POST(createRequest())
        expect(res.status).toBe(200)
      }
      // 11th request should be rate limited
      const response = await POST(createRequest())
      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toContain('Rate limit exceeded')
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })

    it('allows requests after rate limit window expires', async () => {
      vi.useFakeTimers()
      const { POST } = await import('./route')
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await POST(createRequest())
      }
      const limited = await POST(createRequest())
      expect(limited.status).toBe(429)

      // Advance past the 60s window
      vi.advanceTimersByTime(61_000)

      const response = await POST(createRequest())
      expect(response.status).toBe(200)
      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('handles malformed JSON body gracefully', async () => {
      const { POST } = await import('./route')
      const badRequest = new NextRequest('http://localhost:3000/api/invites/claim', {
        method: 'POST',
        body: 'not-json',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
          origin: 'http://localhost:3000',
        },
      })
      // Route does .json().catch(() => ({})), so malformed JSON defaults to {}
      const response = await POST(badRequest)
      expect(response.status).toBe(200)
    })
  })
})
