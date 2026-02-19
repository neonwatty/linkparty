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

import { DELETE } from './route'
import { validateOrigin } from '@/lib/csrf'
import { FRIENDS } from '@/lib/errorMessages'

const originalEnv = process.env
const FRIENDSHIP_UUID = '11111111-1111-1111-1111-111111111111'
const USER_UUID = '22222222-2222-2222-2222-222222222222'
const OTHER_UUID = '33333333-3333-3333-3333-333333333333'

describe('Friends [id] DELETE API Route', () => {
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

  const createRequest = (id: string, action: string | null, headers?: Record<string, string>) => {
    const url = action
      ? `http://localhost:3000/api/friends/${id}?action=${action}`
      : `http://localhost:3000/api/friends/${id}`
    return new NextRequest(url, {
      method: 'DELETE',
      headers: {
        origin: 'http://localhost:3000',
        Authorization: 'Bearer valid-token',
        ...headers,
      },
    })
  }

  const createContext = (id: string) => ({
    params: Promise.resolve({ id }),
  })

  describe('CSRF Validation', () => {
    it('returns 403 when origin is invalid', async () => {
      vi.mocked(validateOrigin).mockReturnValue(false)
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 for invalid id format', async () => {
      const request = createRequest('not-a-uuid', 'decline')
      const response = await DELETE(request, createContext('not-a-uuid'))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid friendship id')
    })

    it('returns 400 for missing action param', async () => {
      const request = createRequest(FRIENDSHIP_UUID, null)
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.INVALID_ACTION)
    })

    it('returns 400 for invalid action param', async () => {
      const request = createRequest(FRIENDSHIP_UUID, 'remove')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.INVALID_ACTION)
    })
  })

  describe('Authentication', () => {
    it('returns 401 when no auth header is present', async () => {
      const request = new NextRequest(`http://localhost:3000/api/friends/${FRIENDSHIP_UUID}?action=decline`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000' },
      })
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when auth token is invalid', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      })
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Friendship Not Found', () => {
    it('returns 404 when friendship does not exist', async () => {
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
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_NOT_FOUND)
    })
  })

  describe('Decline Action', () => {
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
                      user_id: OTHER_UUID,
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
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_NOT_FOUND)
    })

    it('returns 403 when current user is not the recipient', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: OTHER_UUID,
                      friend_id: OTHER_UUID, // Not USER_UUID
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.NOT_AUTHORIZED)
    })

    it('returns 200 on successful decline', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: OTHER_UUID,
                      friend_id: USER_UUID,
                      status: 'pending',
                    },
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
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Cancel Action', () => {
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
                      user_id: USER_UUID,
                      friend_id: OTHER_UUID,
                      status: 'accepted',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'cancel')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_NOT_FOUND)
    })

    it('returns 403 when current user is not the sender', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: OTHER_UUID, // Not USER_UUID
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
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'cancel')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.NOT_AUTHORIZED)
    })

    it('returns 200 on successful cancel', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: USER_UUID,
                      friend_id: OTHER_UUID,
                      status: 'pending',
                    },
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
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'cancel')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Unfriend Action', () => {
    it('returns 404 when friendship is not accepted', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: USER_UUID,
                      friend_id: OTHER_UUID,
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'unfriend')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.REQUEST_NOT_FOUND)
    })

    it('returns 403 when current user is neither side of the friendship', async () => {
      const THIRD_UUID = '44444444-4444-4444-4444-444444444444'
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: OTHER_UUID,
                      friend_id: THIRD_UUID, // Neither is USER_UUID
                      status: 'accepted',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'unfriend')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe(FRIENDS.NOT_AUTHORIZED)
    })

    it('returns 200 on successful unfriend (user is user_id side)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: USER_UUID,
                      friend_id: OTHER_UUID,
                      status: 'accepted',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn((field: string) => {
                // Primary delete returns { eq: fn }
                if (field === 'id') {
                  return Promise.resolve({ error: null })
                }
                // Reverse delete chain: .eq('user_id', ...).eq('friend_id', ...)
                return {
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                }
              }),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'unfriend')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('returns 200 on successful unfriend (user is friend_id side)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: OTHER_UUID,
                      friend_id: USER_UUID,
                      status: 'accepted',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn((field: string) => {
                if (field === 'id') {
                  return Promise.resolve({ error: null })
                }
                return {
                  eq: vi.fn(() => Promise.resolve({ error: null })),
                }
              }),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'unfriend')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Delete Failures', () => {
    it('returns 500 when decline delete fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: OTHER_UUID,
                      friend_id: USER_UUID,
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete failed' } })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'decline')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to decline friend request')
    })

    it('returns 500 when cancel delete fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: USER_UUID,
                      friend_id: OTHER_UUID,
                      status: 'pending',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete failed' } })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'cancel')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to cancel friend request')
    })

    it('returns 500 when unfriend primary delete fails', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: FRIENDSHIP_UUID,
                      user_id: USER_UUID,
                      friend_id: OTHER_UUID,
                      status: 'accepted',
                    },
                    error: null,
                  }),
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: { message: 'Delete failed' } })),
            })),
          }
        }
        return {}
      })
      const request = createRequest(FRIENDSHIP_UUID, 'unfriend')
      const response = await DELETE(request, createContext(FRIENDSHIP_UUID))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to unfriend')
    })
  })
})
