import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockGetUserById = vi.fn()
const mockFrom = vi.fn()

// Terminal mocks
const mockPartySingle = vi.fn()
const mockInviterProfile = vi.fn()
const mockFriendshipsQuery = vi.fn()
const mockNotificationInsert = vi.fn()

let tableCallState: Record<string, number> = {}

function createPartyChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.single = result
  return chain
}

function createFriendshipsChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.in = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createInsertChain(result: Mock) {
  return { insert: result }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string
      const count = (tableCallState[table] || 0) + 1
      tableCallState[table] = count

      if (table === 'parties') {
        return createPartyChain(mockPartySingle)
      }
      if (table === 'user_profiles') {
        return createPartyChain(mockInviterProfile)
      }
      if (table === 'friendships') {
        return createFriendshipsChain(mockFriendshipsQuery)
      }
      if (table === 'notifications') {
        return createInsertChain(mockNotificationInsert)
      }
      return {}
    },
    auth: {
      getUser: mockGetUser,
      admin: { getUserById: mockGetUserById },
    },
  })),
}))

vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn(() => true),
}))

vi.mock('@/lib/email', () => ({
  sendPartyInvitation: vi.fn().mockResolvedValue({ success: true }),
}))

const originalEnv = process.env

const VALID_UUID_1 = '11111111-1111-1111-1111-111111111111'
const VALID_UUID_2 = '22222222-2222-2222-2222-222222222222'

const createRequest = (body: object, includeAuth = true) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', origin: 'http://localhost:3000' }
  if (includeAuth) headers['Authorization'] = 'Bearer test-token'
  return new NextRequest('http://localhost:3000/api/parties/invite-friends', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

const validBody = {
  partyId: 'party-123',
  partyCode: 'ABC123',
  partyName: 'Test Party',
  friendIds: [VALID_UUID_1],
}

describe('Invite Friends API', () => {
  beforeEach(() => {
    tableCallState = {}
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'host@example.com' } },
      error: null,
    })
    mockPartySingle.mockResolvedValue({
      data: { id: 'party-123', expires_at: '2999-01-01T00:00:00Z' },
      error: null,
    })
    mockInviterProfile.mockResolvedValue({
      data: { display_name: 'Host User' },
      error: null,
    })
    mockFriendshipsQuery.mockReturnValue({
      data: [{ friend_id: VALID_UUID_1 }],
      error: null,
    })
    mockNotificationInsert.mockResolvedValue({ error: null })
    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'friend@example.com' } },
      error: null,
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody, false))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('CSRF Validation', () => {
    it('returns 403 when origin is invalid', async () => {
      const { validateOrigin } = await import('@/lib/csrf')
      ;(validateOrigin as Mock).mockReturnValueOnce(false)
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when required fields are missing', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ friendIds: [VALID_UUID_1] }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Missing required fields')
    })

    it('returns 400 when friendIds is empty', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ ...validBody, friendIds: [] }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('friendIds must be a non-empty array')
    })

    it('returns 400 when friendIds exceeds limit of 20', async () => {
      const tooMany = Array.from(
        { length: 21 },
        (_, i) => `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`,
      )
      const { POST } = await import('./route')
      const response = await POST(createRequest({ ...validBody, friendIds: tooMany }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Cannot invite more than 20')
    })

    it('returns 400 when friendIds contains invalid UUIDs', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ ...validBody, friendIds: ['not-a-uuid'] }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid friendIds format')
    })
  })

  describe('Party Validation', () => {
    it('returns 404 when party does not exist', async () => {
      mockPartySingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('Party not found')
    })

    it('returns 410 when party has expired', async () => {
      mockPartySingle.mockResolvedValueOnce({
        data: { id: 'party-123', expires_at: '2020-01-01T00:00:00Z' },
        error: null,
      })
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(410)
      const body = await response.json()
      expect(body.error).toBe('Party has expired')
    })
  })

  describe('Friendship Validation', () => {
    it('returns 400 when no valid friends found', async () => {
      mockFriendshipsQuery.mockReturnValueOnce({ data: [], error: null })
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('No valid friends found to invite')
    })

    it('returns 500 when friendships query fails', async () => {
      mockFriendshipsQuery.mockReturnValueOnce({ data: null, error: { message: 'db error' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
    })
  })

  describe('Successful Invite', () => {
    it('sends notifications and returns invited count', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invited).toBe(1)
    })

    it('invites multiple valid friends', async () => {
      mockFriendshipsQuery.mockReturnValueOnce({
        data: [{ friend_id: VALID_UUID_1 }, { friend_id: VALID_UUID_2 }],
        error: null,
      })
      const { POST } = await import('./route')
      const response = await POST(
        createRequest({
          ...validBody,
          friendIds: [VALID_UUID_1, VALID_UUID_2],
        }),
      )
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invited).toBe(2)
    })

    it('sends email invitations via sendPartyInvitation', async () => {
      const { sendPartyInvitation } = await import('@/lib/email')
      const { POST } = await import('./route')
      await POST(createRequest(validBody))
      expect(sendPartyInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'friend@example.com',
          partyCode: 'ABC123',
          partyName: 'Test Party',
          inviterName: 'Host User',
        }),
      )
    })

    it('continues when email send fails', async () => {
      const { sendPartyInvitation } = await import('@/lib/email')
      ;(sendPartyInvitation as Mock).mockRejectedValueOnce(new Error('email error'))
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.invited).toBe(1)
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when Supabase env vars are missing', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }
      const { POST } = await import('./route')
      const response = await POST(createRequest(validBody))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })
})
