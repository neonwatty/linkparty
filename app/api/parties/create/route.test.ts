import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { webcrypto } from 'node:crypto'

// Ensure crypto.getRandomValues is available (jsdom setup only mocks randomUUID + subtle)
Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...globalThis.crypto,
    randomUUID: () => 'test-uuid-1234',
    subtle: webcrypto.subtle,
    getRandomValues: (arr: Uint8Array) => webcrypto.getRandomValues(arr),
  },
  writable: true,
  configurable: true,
})

// Mock dependencies before importing the route
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/passwordHash', () => ({
  hashPassword: vi.fn(() => Promise.resolve('pbkdf2:100000:abcd1234:hash5678')),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

// Now import the route handler and mocked modules
import { POST } from './route'
import { validateOrigin } from '@/lib/csrf'
import { LIMITS } from '@/lib/errorMessages'

const originalEnv = process.env

describe('Create Party API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    // Reset all mocks
    mockFrom.mockReset()
    mockGetUser.mockReset()

    // Default: parties count check succeeds with 0 active parties
    // and party insert succeeds, and member insert succeeds
    mockFrom.mockImplementation((table: string) => {
      if (table === 'parties') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gt: vi.fn(() => Promise.resolve({ count: 0, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'party-123', code: 'ABC123' },
                  error: null,
                }),
              ),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        }
      }
      if (table === 'party_members') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
      return {}
    })

    vi.mocked(validateOrigin).mockReturnValue(true)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  const createRequest = (body: object, headers?: Record<string, string>) => {
    return new NextRequest('http://localhost:3000/api/parties/create', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        ...headers,
      },
    })
  }

  const validBody = {
    sessionId: 'session-123',
    displayName: 'Test User',
    avatar: '🎉',
    partyName: 'My Party',
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
    it('returns 400 for missing sessionId', async () => {
      const request = createRequest({ ...validBody, sessionId: undefined })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid sessionId')
    })

    it('returns 400 for non-string sessionId', async () => {
      const request = createRequest({ ...validBody, sessionId: 123 })
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

    it('returns 400 for party name too long', async () => {
      const request = createRequest({ ...validBody, partyName: 'A'.repeat(101) })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Party name must be 100 characters or less')
    })

    it('returns 400 for password too long', async () => {
      const request = createRequest({ ...validBody, password: 'A'.repeat(129) })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Password must be 128 characters or less')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when Supabase URL is not configured', async () => {
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

    it('returns 500 when service role key is not configured', async () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
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

  describe('Party Limit', () => {
    it('returns 409 when max active parties reached', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'parties') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => Promise.resolve({ count: 5, error: null })),
              })),
            })),
          }
        }
        return {}
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toBe(LIMITS.MAX_PARTIES)
    })

    it('returns 500 when party count query fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'parties') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => Promise.resolve({ count: null, error: { message: 'DB error' } })),
              })),
            })),
          }
        }
        return {}
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to check party limit')
    })
  })

  describe('Successful Party Creation', () => {
    it('returns 200 with party id and code on success', async () => {
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.party).toHaveProperty('id')
      expect(body.party).toHaveProperty('code')
    })

    it('creates party with password when provided', async () => {
      const request = createRequest({ ...validBody, password: 'secret123' })
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('creates party with authenticated userId', async () => {
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

  describe('Member Insert Failure', () => {
    it('returns 500 and cleans up party when member insert fails', async () => {
      const mockDeleteEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockDeleteFn = vi.fn(() => ({ eq: mockDeleteEq }))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'parties') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => Promise.resolve({ count: 0, error: null })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { id: 'party-123', code: 'ABC123' },
                    error: null,
                  }),
                ),
              })),
            })),
            delete: mockDeleteFn,
          }
        }
        if (table === 'party_members') {
          return {
            insert: vi.fn(() => Promise.resolve({ error: { message: 'Insert failed' } })),
          }
        }
        return {}
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to create party')

      // Verify cleanup was attempted
      expect(mockDeleteFn).toHaveBeenCalled()
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'party-123')
    })
  })

  describe('Party Insert Failure', () => {
    it('returns 500 when party insert fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'parties') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => Promise.resolve({ count: 0, error: null })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'Insert failed' },
                  }),
                ),
              })),
            })),
          }
        }
        return {}
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to create party')
    })
  })
})
