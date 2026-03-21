import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

// Terminal mocks for different queries
const mockInviteTokensResult = vi.fn()
const mockEmailEventsResult = vi.fn()
const mockEmailStatsResult = vi.fn()

let tableCallState: Record<string, number> = {}

function createInviteTokensChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createEmailEventsQueryChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.in = vi.fn(self)
  chain.order = vi.fn(self)
  chain.range = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.ilike = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

function createEmailStatsChain(result: Mock) {
  const chain: Record<string, Mock> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.in = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result()))
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, key: string) => {
    if (key === 'test-anon-key') {
      // Auth client
      return {
        auth: { getUser: mockGetUser },
      }
    }
    // Service role client
    return {
      from: (...args: unknown[]) => {
        mockFrom(...args)
        const table = args[0] as string
        const count = (tableCallState[table] || 0) + 1
        tableCallState[table] = count

        if (table === 'invite_tokens') {
          return createInviteTokensChain(mockInviteTokensResult)
        }
        if (table === 'email_events') {
          // First call is the main query, second call is stats
          if (count === 1) {
            return createEmailEventsQueryChain(mockEmailEventsResult)
          }
          return createEmailStatsChain(mockEmailStatsResult)
        }
        return {}
      },
    }
  }),
}))

const originalEnv = process.env

const createRequest = (params: Record<string, string> = {}, includeAuth = true) => {
  const url = new URL('http://localhost:3000/api/emails/events')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (includeAuth) headers['Authorization'] = 'Bearer test-token'
  return new NextRequest(url, { method: 'GET', headers })
}

describe('Email Events API', () => {
  beforeEach(() => {
    tableCallState = {}
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      ADMIN_EMAILS: 'test@example.com,other-admin@example.com',
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } }, error: null })
    mockInviteTokensResult.mockReturnValue({
      data: [{ invitee_email: 'friend1@example.com' }, { invitee_email: 'friend2@example.com' }],
      error: null,
    })
    mockEmailEventsResult.mockReturnValue({
      data: [
        { id: 'evt-1', event_type: 'email.sent', recipient: 'friend1@example.com', created_at: '2026-01-01' },
        { id: 'evt-2', event_type: 'email.delivered', recipient: 'friend2@example.com', created_at: '2026-01-02' },
      ],
      error: null,
      count: 2,
    })
    mockEmailStatsResult.mockReturnValue({
      data: [
        { event_type: 'email.sent' },
        { event_type: 'email.delivered' },
        { event_type: 'email.opened' },
        { event_type: 'email.bounced' },
        { event_type: 'email.clicked' },
      ],
      error: null,
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest({}, false))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 403 when user is not an admin', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-456', email: 'nonadmin@example.com' } },
        error: null,
      })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when Supabase env vars are missing', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })

  describe('Empty Results', () => {
    it('returns empty events and zero stats when user has no invites', async () => {
      mockInviteTokensResult.mockReturnValueOnce({ data: [], error: null })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.events).toEqual([])
      expect(body.total).toBe(0)
      expect(body.stats.total).toBe(0)
      expect(body.stats.sent).toBe(0)
      expect(body.stats.delivered).toBe(0)
      expect(body.stats.deliveryRate).toBe(0)
    })
  })

  describe('Successful Responses', () => {
    it('returns events with correct stats', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.events).toHaveLength(2)
      expect(body.count).toBeUndefined() // count is returned as "total"
      expect(body.stats.total).toBe(5)
      expect(body.stats.sent).toBe(1)
      expect(body.stats.delivered).toBe(1)
      expect(body.stats.bounced).toBe(1)
      expect(body.stats.opened).toBe(1)
      expect(body.stats.clicked).toBe(1)
    })

    it('calculates delivery and open rates correctly', async () => {
      mockEmailStatsResult.mockReturnValueOnce({
        data: [
          { event_type: 'email.sent' },
          { event_type: 'email.sent' },
          { event_type: 'email.delivered' },
          { event_type: 'email.delivered' },
          { event_type: 'email.opened' },
        ],
        error: null,
      })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      // deliveryRate = round(2/2 * 100) = 100
      expect(body.stats.deliveryRate).toBe(100)
      // openRate = round(1/2 * 100) = 50
      expect(body.stats.openRate).toBe(50)
    })
  })

  describe('Query Parameters', () => {
    it('respects limit param (max 100)', async () => {
      const { GET } = await import('./route')
      // Requesting limit=200 should be capped at 100
      const response = await GET(createRequest({ limit: '200' }))
      expect(response.status).toBe(200)
    })

    it('uses default limit of 50 when not specified', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
    })

    it('passes type filter to query', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest({ type: 'email.sent' }))
      expect(response.status).toBe(200)
    })

    it('passes recipient filter to query', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest({ recipient: 'friend1@example.com' }))
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when invite tokens query fails', async () => {
      mockInviteTokensResult.mockReturnValueOnce({ data: null, error: { message: 'db error' } })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch invite data')
    })

    it('returns 500 when email events query fails', async () => {
      mockEmailEventsResult.mockReturnValueOnce({ data: null, error: { message: 'db error' }, count: null })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch email events')
    })

    it('handles stats query failure gracefully (still returns events)', async () => {
      mockEmailStatsResult.mockReturnValueOnce({ data: null, error: { message: 'stats error' } })
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.events).toHaveLength(2)
      // Stats should still be returned with zeroes
      expect(body.stats.total).toBe(0)
    })
  })
})
