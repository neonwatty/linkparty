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

import { POST } from './route'
import { validateOrigin } from '@/lib/csrf'
import { FRIENDS } from '@/lib/errorMessages'

const originalEnv = process.env
const FRIENDSHIP_UUID = '11111111-1111-1111-1111-111111111111'
const USER_UUID = '22222222-2222-2222-2222-222222222222'
const SENDER_UUID = '33333333-3333-3333-3333-333333333333'

describe('Friends Accept API Route', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    mockFrom.mockReset()
    mockGetUser.mockReset()

    vi.mocked(validateOrigin).mockReturnValue(true)

    // Default: authenticated user (the recipient)
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_UUID } },
      error: null,
    })

    // Default mock: successful acceptance flow
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friendships') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: FRIENDSHIP_UUID,
                    user_id: SENDER_UUID,
                    friend_id: USER_UUID,
                    status: 'pending',
                  },
                  error: null,
                }),
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          upsert: vi.fn(() => Promise.resolve({ error: null })),
        }
      }
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
              single: vi.fn(() => Promise.resolve({ data: { display_name: 'Test User' }, error: null })),
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
    return new NextRequest('http://localhost:3000/api/friends/accept', {
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
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for missing friendshipId', async () => {
      const request = createRequest({})
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendshipId')
    })

    it('returns 400 for non-string friendshipId', async () => {
      const request = createRequest({ friendshipId: 12345 })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendshipId')
    })

    it('returns 400 for invalid UUID format', async () => {
      const request = createRequest({ friendshipId: 'not-a-uuid' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendshipId')
    })
  })

  describe('Authentication', () => {
    it('returns 401 when no auth header is present', async () => {
      const request = new NextRequest('http://localhost:3000/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendshipId: FRIENDSHIP_UUID }),
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
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Business Logic', () => {
    it('returns 404 when friendship not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_NOT_FOUND)
    })

    it('returns 403 when user is blocked', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: SENDER_UUID,
                      friend_id: USER_UUID,
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
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
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.BLOCKED)
    })

    it('returns 404 when friendship is not pending', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: SENDER_UUID,
                      friend_id: USER_UUID,
                      status: 'accepted',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_NOT_FOUND)
    })

    it('returns 403 when current user is not the recipient', async () => {
      // Current user is USER_UUID but friendship has friend_id = SENDER_UUID (someone else is the recipient)
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: SENDER_UUID,
                      friend_id: SENDER_UUID, // not USER_UUID
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.NOT_AUTHORIZED)
    })
  })

  describe('Successful Acceptance', () => {
    it('returns 200 on successful acceptance', async () => {
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Update and Reverse Row Failures', () => {
    it('returns 500 when update to accepted fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: SENDER_UUID,
                      friend_id: USER_UUID,
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } })),
            })),
          }
        }
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to accept friend request')
    })

    it('returns 500 and reverts to pending when reverse row insert fails', async () => {
      const mockUpdateEq = vi.fn(() => Promise.resolve({ error: null }))
      const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: SENDER_UUID,
                      friend_id: USER_UUID,
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            update: mockUpdate,
            upsert: vi.fn(() => Promise.resolve({ error: { message: 'Upsert failed' } })),
          }
        }
        if (table === 'user_blocks') {
          return {
            select: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest({ friendshipId: FRIENDSHIP_UUID })
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to accept friend request')
      // Verify revert was called (update called twice: once for accept, once for revert)
      expect(mockUpdate).toHaveBeenCalledTimes(2)
    })
  })
})
