import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing the route
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/passwordHash', () => ({
  verifyPassword: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

// Now import the route handler and mocked modules
import { POST } from './route'
import { validateOrigin } from '@/lib/csrf'
import { verifyPassword } from '@/lib/passwordHash'
import { LIMITS } from '@/lib/errorMessages'

const originalEnv = process.env

// Helper to build a non-expired party object
const futureDate = new Date(Date.now() + 86400000).toISOString()

function makeParty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'party-123',
    code: 'ABC123',
    password_hash: null,
    expires_at: futureDate,
    ...overrides,
  }
}

describe('Join Party API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    mockFrom.mockReset()
    mockGetUser.mockReset()
    vi.mocked(validateOrigin).mockReturnValue(true)
    vi.mocked(verifyPassword).mockResolvedValue(true)

    // Default mock: party found, no existing member, count = 0, upsert succeeds
    setupDefaultMocks()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  function setupDefaultMocks(overrides?: {
    party?: Record<string, unknown> | null
    partyError?: Record<string, unknown> | null
    existingMember?: Record<string, unknown> | null
    memberCount?: number
    memberCountError?: Record<string, unknown> | null
    upsertError?: Record<string, unknown> | null
  }) {
    const opts = {
      party: makeParty(),
      partyError: null,
      existingMember: null,
      memberCount: 0,
      memberCountError: null,
      upsertError: null,
      ...overrides,
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'parties') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: opts.party,
                  error: opts.partyError,
                }),
              ),
            })),
          })),
        }
      }
      if (table === 'party_members') {
        return {
          select: vi.fn((selectArg?: string) => {
            // When called with 'id' -> existingMember check
            if (selectArg === 'id') {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() =>
                      Promise.resolve({
                        data: opts.existingMember,
                        error: null,
                      }),
                    ),
                  })),
                })),
              }
            }
            // When called with '*' and { count, head } -> member count check
            return {
              eq: vi.fn(() =>
                Promise.resolve({
                  count: opts.memberCount,
                  error: opts.memberCountError,
                }),
              ),
            }
          }),
          upsert: vi.fn(() => Promise.resolve({ error: opts.upsertError })),
        }
      }
      return {}
    })
  }

  const createRequest = (body: object, headers?: Record<string, string>) => {
    return new NextRequest('http://localhost:3000/api/parties/join', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 255)}`,
        ...headers,
      },
    })
  }

  const validBody = {
    code: 'ABC123',
    sessionId: 'session-123',
    displayName: 'Test User',
    avatar: '🎉',
  }

  describe('CSRF Validation', () => {
    it('returns 403 when origin is invalid', async () => {
      vi.mocked(validateOrigin).mockReturnValue(false)

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for missing party code', async () => {
      const request = createRequest({ ...validBody, code: undefined })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid party code')
    })

    it('returns 400 for party code with wrong length', async () => {
      const request = createRequest({ ...validBody, code: 'ABC' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid party code')
    })

    it('returns 400 for non-string party code', async () => {
      const request = createRequest({ ...validBody, code: 123456 })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid party code')
    })

    it('returns 400 for missing sessionId', async () => {
      const request = createRequest({ ...validBody, sessionId: undefined })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid sessionId')
    })

    it('returns 400 for non-string sessionId', async () => {
      const request = createRequest({ ...validBody, sessionId: 456 })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid sessionId')
    })

    it('returns 400 for display name too short', async () => {
      const request = createRequest({ ...validBody, displayName: 'A' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Display name must be 2-50 characters')
    })

    it('returns 400 for display name too long', async () => {
      const request = createRequest({ ...validBody, displayName: 'A'.repeat(51) })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Display name must be 2-50 characters')
    })

    it('returns 400 for missing display name', async () => {
      const request = createRequest({ ...validBody, displayName: undefined })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Display name must be 2-50 characters')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when Supabase config is missing', async () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })

  describe('User Authentication', () => {
    it('returns 401 when userId provided without auth token', async () => {
      const request = createRequest({ ...validBody, userId: 'user-123' })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Authentication required when userId is provided')
    })

    it('returns 403 when userId does not match authenticated user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'different-user' } },
      })

      const request = createRequest({ ...validBody, userId: 'user-123' }, { authorization: 'Bearer test-token' })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('userId does not match authenticated user')
    })

    it('returns 403 when auth returns no user', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const request = createRequest({ ...validBody, userId: 'user-123' }, { authorization: 'Bearer test-token' })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('userId does not match authenticated user')
    })
  })

  describe('Party Lookup', () => {
    it('returns 404 when party is not found', async () => {
      setupDefaultMocks({ party: null, partyError: { message: 'Not found' } })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(LIMITS.PARTY_NOT_FOUND)
    })

    it('returns 410 when party is expired', async () => {
      const expiredDate = new Date(Date.now() - 86400000).toISOString()
      setupDefaultMocks({ party: makeParty({ expires_at: expiredDate }) })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(410)
      const body = await response.json()
      expect(body.error).toBe(LIMITS.PARTY_EXPIRED)
    })
  })

  describe('Password Verification', () => {
    it('returns needsPassword when party has password and no password provided', async () => {
      setupDefaultMocks({
        party: makeParty({ password_hash: 'pbkdf2:100000:salt:hash' }),
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.needsPassword).toBe(true)
    })

    it('returns 401 when password is incorrect', async () => {
      setupDefaultMocks({
        party: makeParty({ password_hash: 'pbkdf2:100000:salt:hash' }),
      })
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const request = createRequest({ ...validBody, password: 'wrongpass' })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe(LIMITS.INCORRECT_PASSWORD)
    })

    it('accepts correct password for password-protected party', async () => {
      setupDefaultMocks({
        party: makeParty({ password_hash: 'pbkdf2:100000:salt:hash' }),
      })
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const request = createRequest({ ...validBody, password: 'correctpass' })
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Member Limit', () => {
    it('returns 409 when party is full', async () => {
      setupDefaultMocks({ memberCount: 20 })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toBe(LIMITS.MAX_MEMBERS)
    })

    it('returns 500 when member count query fails', async () => {
      setupDefaultMocks({ memberCountError: { message: 'DB error' } })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to check member limit')
    })
  })

  describe('Existing Member Re-join', () => {
    it('skips password check and member limit for existing member', async () => {
      setupDefaultMocks({
        party: makeParty({ password_hash: 'pbkdf2:100000:salt:hash' }),
        existingMember: { id: 'member-123' },
        memberCount: 20,
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Successful Join', () => {
    it('returns 200 with party id and code on success', async () => {
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.party).toEqual({ id: 'party-123', code: 'ABC123' })
    })

    it('joins with authenticated userId', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      })

      const request = createRequest({ ...validBody, userId: 'user-123' }, { authorization: 'Bearer valid-token' })
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Member Upsert Failure', () => {
    it('returns 500 when member upsert fails', async () => {
      setupDefaultMocks({ upsertError: { message: 'Upsert failed' } })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to join party')
    })
  })
})
