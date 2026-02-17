import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockMemberMaybeSingle = vi.fn()
const mockMembersResult = vi.fn()
const mockTokensResult = vi.fn()
const mockDeleteIn = vi.fn()
const mockNotificationLogsUpdate = vi.fn()
const mockFrom = vi.fn()

function createMembershipChain(terminal: Mock) {
  const chain: Record<string, Mock> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.maybeSingle = terminal
  return chain
}

function createMembersQueryChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.neq = vi.fn(self)
  // The members query resolves directly from the chain (no terminal method like maybeSingle)
  // We make the chain itself thenable so `await membersQuery` works
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createPushTokensChain(selectResult: Mock, deleteResult: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.in = vi.fn(() => selectResult())
  chain.delete = vi.fn(() => ({ in: deleteResult }))
  return chain
}

function createNotificationLogsChain(terminal: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.update = vi.fn(self)
  chain.eq = vi.fn(self)
  // Terminal: the last .eq() call resolves the chain
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminal()))
  return chain
}

let membershipCallCount = 0

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string
      if (table === 'party_members') {
        membershipCallCount++
        // First call is membership check (.maybeSingle), second is member list query
        if (membershipCallCount % 2 === 1) {
          return createMembershipChain(mockMemberMaybeSingle)
        }
        return createMembersQueryChain(mockMembersResult)
      }
      if (table === 'push_tokens') return createPushTokensChain(mockTokensResult, mockDeleteIn)
      if (table === 'notification_logs') return createNotificationLogsChain(mockNotificationLogsUpdate)
      return {}
    },
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn().mockResolvedValue({}),
}))

import webpush from 'web-push'

const originalEnv = process.env

const createRequest = (body: object, includeAuth = true) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (includeAuth) headers['Authorization'] = 'Bearer test-token'
  return new NextRequest('http://localhost:3000/api/push/send', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('Push Send API', () => {
  beforeEach(() => {
    membershipCallCount = 0
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-vapid-public',
      VAPID_PRIVATE_KEY: 'test-vapid-private',
      VAPID_CONTACT_EMAIL: 'mailto:test@example.com',
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockMemberMaybeSingle.mockResolvedValue({ data: { id: 'member-1' }, error: null })
    mockMembersResult.mockReturnValue({
      data: [{ session_id: 'sess-a' }, { session_id: 'sess-b' }],
      error: null,
    })
    mockTokensResult.mockReturnValue({
      data: [
        { session_id: 'sess-a', token: JSON.stringify({ endpoint: 'https://push.example.com/a', keys: {} }) },
        { session_id: 'sess-b', token: JSON.stringify({ endpoint: 'https://push.example.com/b', keys: {} }) },
      ],
      error: null,
    })
    mockDeleteIn.mockResolvedValue({ error: null })
    mockNotificationLogsUpdate.mockReturnValue({ error: null })
    ;(webpush.sendNotification as Mock).mockResolvedValue({})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Request Validation', () => {
    it('returns 400 when partyId is missing', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({}))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing partyId')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when env vars are missing', async () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
        VAPID_PRIVATE_KEY: undefined,
        VAPID_CONTACT_EMAIL: undefined,
      }
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server not configured for push')
    })
  })

  describe('Authentication', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }, false))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid token' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('Membership', () => {
    it('returns 403 when user is not a party member', async () => {
      mockMemberMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('You must be a member of this party')
    })

    it('returns 403 when membership query errors', async () => {
      mockMemberMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'db error' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('You must be a member of this party')
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    it('allows requests under the limit', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('returns 429 with Retry-After when limit exceeded', async () => {
      const { POST } = await import('./route')
      // Make 30 requests to exhaust the limit
      for (let i = 0; i < 30; i++) {
        const res = await POST(createRequest({ partyId: 'p1' }))
        expect(res.status).toBe(200)
      }
      // 31st request should be rate limited
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.error).toContain('Rate limit exceeded')
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })

    it('allows requests after window expires', async () => {
      vi.useFakeTimers()
      const { POST } = await import('./route')
      // Exhaust the limit
      for (let i = 0; i < 30; i++) {
        await POST(createRequest({ partyId: 'p1' }))
      }
      const limited = await POST(createRequest({ partyId: 'p1' }))
      expect(limited.status).toBe(429)

      // Advance past the 60s window
      vi.advanceTimersByTime(61_000)

      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      vi.useRealTimers()
    })
  })

  describe('Recipient Resolution', () => {
    it('returns 500 when party members query fails', async () => {
      mockMembersResult.mockReturnValueOnce({ data: null, error: { message: 'db error' } })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch recipients')
    })

    it('returns sent:0 when no members after excluding sender', async () => {
      mockMembersResult.mockReturnValueOnce({ data: [], error: null })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1', excludeSessionId: 'sess-sender' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.sent).toBe(0)
    })

    it('returns sent:0 when no push tokens found', async () => {
      mockTokensResult.mockReturnValueOnce({ data: [], error: null })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.sent).toBe(0)
    })
  })

  describe('Notification Delivery', () => {
    it('sends to all tokens and returns correct sent count', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.sent).toBe(2)
      expect(body.failed).toBe(0)
      expect(body.staleRemoved).toBe(0)
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2)
    })

    it('handles mixed success/failure and returns sent + failed counts', async () => {
      ;(webpush.sendNotification as Mock)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({ statusCode: 500, message: 'server error' })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.sent).toBe(1)
      expect(body.failed).toBe(1)
      expect(body.staleRemoved).toBe(0)
    })

    it('cleans up stale tokens (410/404) from database', async () => {
      ;(webpush.sendNotification as Mock)
        .mockRejectedValueOnce({ statusCode: 410, message: 'Gone' })
        .mockRejectedValueOnce({ statusCode: 404, message: 'Not Found' })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.sent).toBe(0)
      expect(body.failed).toBe(2)
      expect(body.staleRemoved).toBe(2)
      expect(mockDeleteIn).toHaveBeenCalledWith('session_id', ['sess-a', 'sess-b'])
    })

    it('increments failed for malformed token JSON', async () => {
      mockTokensResult.mockReturnValueOnce({
        data: [{ session_id: 'sess-x', token: 'not-valid-json' }],
        error: null,
      })
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.sent).toBe(0)
      expect(body.failed).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 on unexpected error', async () => {
      const { POST } = await import('./route')
      // Pass a request whose json() throws
      const badRequest = new NextRequest('http://localhost:3000/api/push/send', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      })
      const response = await POST(badRequest)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Internal server error')
    })
  })
})
