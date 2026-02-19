import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

import { POST, DELETE } from './route'
import { validateOrigin } from '@/lib/csrf'

const originalEnv = process.env
const USER_UUID = '22222222-2222-2222-2222-222222222222'
const TARGET_UUID = '33333333-3333-3333-3333-333333333333'

describe('Users Block API Route', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    mockFrom.mockReset()
    mockGetUser.mockReset()

    vi.mocked(validateOrigin).mockReturnValue(true)

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_UUID } },
      error: null,
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('POST (Block User)', () => {
    const createPostRequest = (body: object, headers?: Record<string, string>) => {
      return new NextRequest('http://localhost:3000/api/users/block', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
          origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
          ...headers,
        },
      })
    }

    describe('CSRF Validation', () => {
      it('returns 403 when origin is invalid', async () => {
        vi.mocked(validateOrigin).mockReturnValue(false)
        const request = createPostRequest({ userId: TARGET_UUID })
        const response = await POST(request)
        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body.error).toBe('Forbidden')
      })
    })

    describe('Request Validation', () => {
      it('returns 400 for missing userId', async () => {
        const request = createPostRequest({})
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('Missing or invalid userId')
      })

      it('returns 400 for non-string userId', async () => {
        const request = createPostRequest({ userId: 12345 })
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('Missing or invalid userId')
      })

      it('returns 400 for invalid UUID format', async () => {
        const request = createPostRequest({ userId: 'not-a-uuid' })
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('Missing or invalid userId')
      })
    })

    describe('Authentication', () => {
      it('returns 401 when no auth header is present', async () => {
        const request = new NextRequest('http://localhost:3000/api/users/block', {
          method: 'POST',
          body: JSON.stringify({ userId: TARGET_UUID }),
          headers: {
            'Content-Type': 'application/json',
            origin: 'http://localhost:3000',
          },
        })
        const response = await POST(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })

      it('returns 401 when auth token is invalid', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        })
        const request = createPostRequest({ userId: TARGET_UUID })
        const response = await POST(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })
    })

    describe('Business Logic', () => {
      it('returns 400 when trying to block yourself', async () => {
        const request = createPostRequest({ userId: USER_UUID })
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('You cannot block yourself')
      })

      it('returns 409 when user is already blocked (unique constraint)', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'user_blocks') {
            return {
              insert: vi.fn(() => Promise.resolve({ error: { code: '23505', message: 'unique violation' } })),
            }
          }
          return {}
        })
        const request = createPostRequest({ userId: TARGET_UUID })
        const response = await POST(request)
        expect(response.status).toBe(409)
        const body = await response.json()
        expect(body.error).toBe('User is already blocked')
      })

      it('returns 500 when block insert fails (non-duplicate error)', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'user_blocks') {
            return {
              insert: vi.fn(() => Promise.resolve({ error: { code: '50000', message: 'DB error' } })),
            }
          }
          return {}
        })
        const request = createPostRequest({ userId: TARGET_UUID })
        const response = await POST(request)
        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body.error).toBe('Failed to block user')
      })
    })

    describe('Successful Block', () => {
      it('returns 200 and removes friendships on successful block', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'user_blocks') {
            return {
              insert: vi.fn(() => Promise.resolve({ error: null })),
            }
          }
          if (table === 'friendships') {
            return {
              delete: vi.fn(() => ({
                or: vi.fn(() => Promise.resolve({ error: null })),
              })),
            }
          }
          return {}
        })
        const request = createPostRequest({ userId: TARGET_UUID })
        const response = await POST(request)
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.success).toBe(true)
      })
    })
  })

  describe('DELETE (Unblock User)', () => {
    const createDeleteRequest = (userId: string | null, headers?: Record<string, string>) => {
      const url = userId
        ? `http://localhost:3000/api/users/block?userId=${userId}`
        : 'http://localhost:3000/api/users/block'
      return new NextRequest(url, {
        method: 'DELETE',
        headers: {
          origin: 'http://localhost:3000',
          Authorization: 'Bearer valid-token',
          ...headers,
        },
      })
    }

    describe('CSRF Validation', () => {
      it('returns 403 when origin is invalid', async () => {
        vi.mocked(validateOrigin).mockReturnValue(false)
        const request = createDeleteRequest(TARGET_UUID)
        const response = await DELETE(request)
        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body.error).toBe('Forbidden')
      })
    })

    describe('Request Validation', () => {
      it('returns 400 for missing userId query param', async () => {
        const request = createDeleteRequest(null)
        const response = await DELETE(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('Missing or invalid userId')
      })

      it('returns 400 for invalid userId UUID format', async () => {
        const request = createDeleteRequest('not-a-uuid')
        const response = await DELETE(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toBe('Missing or invalid userId')
      })
    })

    describe('Authentication', () => {
      it('returns 401 when no auth header is present', async () => {
        const request = new NextRequest(`http://localhost:3000/api/users/block?userId=${TARGET_UUID}`, {
          method: 'DELETE',
          headers: { origin: 'http://localhost:3000' },
        })
        const response = await DELETE(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })

      it('returns 401 when auth token is invalid', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        })
        const request = createDeleteRequest(TARGET_UUID)
        const response = await DELETE(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })
    })

    describe('Successful Unblock', () => {
      it('returns 200 on successful unblock', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'user_blocks') {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                })),
              })),
            }
          }
          return {}
        })
        const request = createDeleteRequest(TARGET_UUID)
        const response = await DELETE(request)
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.success).toBe(true)
      })
    })

    describe('Delete Failure', () => {
      it('returns 500 when unblock delete fails', async () => {
        mockFrom.mockImplementation((table: string) => {
          if (table === 'user_blocks') {
            return {
              delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete failed' } })),
                })),
              })),
            }
          }
          return {}
        })
        const request = createDeleteRequest(TARGET_UUID)
        const response = await DELETE(request)
        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body.error).toBe('Failed to unblock user')
      })
    })
  })
})
