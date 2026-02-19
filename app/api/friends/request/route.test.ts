import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing the route
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

import { POST } from './route'
import { validateOrigin } from '@/lib/csrf'
import { FRIENDS } from '@/lib/errorMessages'

const originalEnv = process.env
const VALID_UUID = '11111111-1111-1111-1111-111111111111'
const USER_UUID = '22222222-2222-2222-2222-222222222222'

describe('Friends Request API Route', () => {
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

    // Default mock: all DB calls succeed with benign results
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_blocks') {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        }
      }
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: VALID_UUID }, error: null })),
            })),
          })),
        }
      }
      if (table === 'friendships') {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'friendship-1', user_id: USER_UUID, friend_id: VALID_UUID, status: 'pending' },
                  error: null,
                }),
              ),
            })),
          })),
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
      return {}
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  const createRequest = (body: object, headers?: Record<string, string>) => {
    return new NextRequest('http://localhost:3000/api/friends/request', {
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
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for missing friendId', async () => {
      const request = createRequest({})
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendId')
    })

    it('returns 400 for non-string friendId', async () => {
      const request = createRequest({ friendId: 12345 })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendId')
    })

    it('returns 400 for invalid UUID format', async () => {
      const request = createRequest({ friendId: 'not-a-uuid' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendId')
    })
  })

  describe('Authentication', () => {
    it('returns 401 when no auth header is present', async () => {
      const request = new NextRequest('http://localhost:3000/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friendId: VALID_UUID }),
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
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Business Logic', () => {
    it('returns 400 when trying to friend yourself', async () => {
      const request = createRequest({ friendId: USER_UUID })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.CANNOT_FRIEND_SELF)
    })

    it('returns 403 when user is blocked', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [{ id: 'block-1' }], error: null })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.BLOCKED)
    })

    it('returns 404 when target user does not exist', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found', code: 'PGRST116' } })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.USER_NOT_FOUND)
    })

    it('returns 409 when already friends', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: VALID_UUID }, error: null })),
              })),
            })),
          }
        }
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() =>
                Promise.resolve({
                  data: [{ status: 'accepted', user_id: USER_UUID, friend_id: VALID_UUID }],
                  error: null,
                }),
              ),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.ALREADY_FRIENDS)
    })

    it('returns 409 when outgoing pending request exists', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: VALID_UUID }, error: null })),
              })),
            })),
          }
        }
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() =>
                Promise.resolve({
                  data: [{ status: 'pending', user_id: USER_UUID, friend_id: VALID_UUID }],
                  error: null,
                }),
              ),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_EXISTS)
    })

    it('returns 409 when incoming pending request exists', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: VALID_UUID }, error: null })),
              })),
            })),
          }
        }
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() =>
                Promise.resolve({
                  data: [{ status: 'pending', user_id: VALID_UUID, friend_id: USER_UUID }],
                  error: null,
                }),
              ),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_INCOMING)
    })

    it('returns 409 on unique constraint violation (race condition)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: VALID_UUID }, error: null })),
              })),
            })),
          }
        }
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { code: '23505', message: 'unique violation' },
                  }),
                ),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_EXISTS)
    })
  })

  describe('Successful Request', () => {
    it('returns 200 with friendship on success', async () => {
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.friendship).toBeDefined()
      expect(body.friendship.user_id).toBe(USER_UUID)
      expect(body.friendship.friend_id).toBe(VALID_UUID)
      expect(body.friendship.status).toBe('pending')
    })
  })

  describe('Existing Friendship Check Failure', () => {
    it('returns 500 when existing friendship query fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: VALID_UUID }, error: null })),
              })),
            })),
          }
        }
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: 'DB error' },
                }),
              ),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendId: VALID_UUID })
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
    })
  })
})
