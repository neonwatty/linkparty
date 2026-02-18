import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

const mockMemberMaybeSingle = vi.fn()
const mockUpsert = vi.fn()
const mockDeleteEq = vi.fn()
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

function createMemberChain(terminal: Mock) {
  const chain: Record<string, Mock> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.maybeSingle = terminal
  return chain
}

function createPushTokensChain() {
  const chain: Record<string, Mock> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.upsert = mockUpsert
  chain.delete = vi.fn(() => ({ eq: mockDeleteEq }))
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string
      if (table === 'party_members') return createMemberChain(mockMemberMaybeSingle)
      return createPushTokensChain()
    },
    auth: { getUser: mockGetUser },
  })),
}))

const originalEnv = process.env

describe('Push Subscribe API', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
    mockMemberMaybeSingle.mockResolvedValue({ data: { id: 'member-123' }, error: null })
    mockUpsert.mockResolvedValue({ error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  const createRequest = (body: object, method = 'POST', includeAuth = true) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', origin: 'http://localhost:3000' }
    if (includeAuth) {
      headers['Authorization'] = 'Bearer test-token-123'
    }
    return new NextRequest('http://localhost:3000/api/push/subscribe', {
      method,
      body: JSON.stringify(body),
      headers,
    })
  }

  const validPostBody = {
    sessionId: 'session-abc',
    subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'key1', auth: 'key2' } },
  }

  describe('POST', () => {
    describe('Request Validation', () => {
      it('returns 400 when sessionId is missing', async () => {
        const { POST } = await import('./route')
        const request = createRequest({ subscription: validPostBody.subscription })
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toContain('Missing sessionId or subscription')
      })

      it('returns 400 when subscription is missing', async () => {
        const { POST } = await import('./route')
        const request = createRequest({ sessionId: 'session-abc' })
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toContain('Missing sessionId or subscription')
      })

      it('returns 400 when subscription.endpoint is missing', async () => {
        const { POST } = await import('./route')
        const request = createRequest({ sessionId: 'session-abc', subscription: { keys: {} } })
        const response = await POST(request)
        expect(response.status).toBe(400)
        const body = await response.json()
        expect(body.error).toContain('Missing sessionId or subscription')
      })
    })

    describe('Server Configuration', () => {
      it('returns 500 when env vars are missing', async () => {
        process.env = {
          ...originalEnv,
          NEXT_PUBLIC_SUPABASE_URL: undefined,
          SUPABASE_SERVICE_ROLE_KEY: undefined,
        }
        const { POST } = await import('./route')
        const request = createRequest(validPostBody)
        const response = await POST(request)
        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body.error).toContain('Server not configured')
      })
    })

    describe('Authentication', () => {
      it('returns 401 when Authorization header is missing', async () => {
        const { POST } = await import('./route')
        const request = createRequest(validPostBody, 'POST', false)
        const response = await POST(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })

      it('returns 401 when token format is invalid', async () => {
        const { POST } = await import('./route')
        const request = new NextRequest('http://localhost:3000/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(validPostBody),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic bad-format',
            origin: 'http://localhost:3000',
          },
        })
        const response = await POST(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })

      it('returns 401 when getUser returns error', async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid token' } })
        const { POST } = await import('./route')
        const request = createRequest(validPostBody)
        const response = await POST(request)
        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body.error).toBe('Unauthorized')
      })
    })

    describe('Session Ownership', () => {
      it('returns 403 when session does not belong to user', async () => {
        mockMemberMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
        const { POST } = await import('./route')
        const request = createRequest(validPostBody)
        const response = await POST(request)
        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body.error).toContain('Session does not belong to this user')
      })
    })

    describe('Persistence', () => {
      it('returns 500 when upsert fails', async () => {
        mockUpsert.mockResolvedValueOnce({ error: { message: 'db error' } })
        const { POST } = await import('./route')
        const request = createRequest(validPostBody)
        const response = await POST(request)
        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body.error).toContain('Failed to save subscription')
      })

      it('returns 200 on successful upsert', async () => {
        const { POST } = await import('./route')
        const request = createRequest(validPostBody)
        const response = await POST(request)
        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.success).toBe(true)
      })
    })
  })

  describe('DELETE', () => {
    it('returns 400 when sessionId is missing', async () => {
      const { DELETE } = await import('./route')
      const request = createRequest({}, 'DELETE')
      const response = await DELETE(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Missing sessionId')
    })

    it('returns 401 when token is invalid', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad token' } })
      const { DELETE } = await import('./route')
      const request = createRequest({ sessionId: 'session-abc' }, 'DELETE')
      const response = await DELETE(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 403 when session is not owned by user', async () => {
      mockMemberMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      const { DELETE } = await import('./route')
      const request = createRequest({ sessionId: 'session-abc' }, 'DELETE')
      const response = await DELETE(request)
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain('Session does not belong to this user')
    })

    it('returns 500 when delete fails', async () => {
      mockDeleteEq.mockResolvedValueOnce({ error: { message: 'db error' } })
      const { DELETE } = await import('./route')
      const request = createRequest({ sessionId: 'session-abc' }, 'DELETE')
      const response = await DELETE(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Failed to delete subscription')
    })

    it('returns 200 on successful delete', async () => {
      const { DELETE } = await import('./route')
      const request = createRequest({ sessionId: 'session-abc' }, 'DELETE')
      const response = await DELETE(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })
})
