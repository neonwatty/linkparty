import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Supabase with flexible chain that supports both party lookup and dedup query
const mockPartySingle = vi.fn()
const mockDedupMaybeSingle = vi.fn()
const mockFrom = vi.fn()

function createChain(terminal: Mock) {
  const chain: Record<string, Mock> = {}
  const handler = () => chain
  chain.select = vi.fn(handler)
  chain.eq = vi.fn(handler)
  chain.limit = vi.fn(handler)
  chain.single = terminal
  chain.maybeSingle = terminal
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string
      if (table === 'invite_tokens') return createChain(mockDedupMaybeSingle)
      return createChain(mockPartySingle)
    },
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}))

// Mock email sending
const mockSendPartyInvitation = vi.fn()
vi.mock('@/lib/email', () => ({
  sendPartyInvitation: (...args: unknown[]) => mockSendPartyInvitation(...args),
}))

// Store original env
const originalEnv = process.env

describe('Email Invite API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
    mockSendPartyInvitation.mockResolvedValue({ success: true, id: 'email-id-123' })
    mockPartySingle.mockResolvedValue({
      data: { id: 'party-id-123', code: 'ABC123', expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    })
    mockDedupMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost:3000/api/emails/invite', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const validBody = {
    email: 'guest@example.com',
    partyCode: 'ABC123',
    partyName: 'Test Party',
    inviterName: 'Host User',
  }

  describe('Request Validation', () => {
    it('returns 400 when email is missing', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, email: '' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Missing required fields')
    })

    it('returns 400 when partyCode is missing', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, partyCode: '' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Missing required fields')
    })

    it('returns 400 when partyName is missing', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, partyName: '' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Missing required fields')
    })

    it('returns 400 when inviterName is missing', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, inviterName: '' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Missing required fields')
    })

    it('returns 400 for invalid email format', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, email: 'not-an-email' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Invalid email')
    })

    it('returns 400 for invalid party code format', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, partyCode: 'TOOLONGCODE' })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Invalid party code')
    })
  })

  describe('Party Verification', () => {
    it('returns 404 when party is not found', async () => {
      mockPartySingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
      const { POST } = await import('./route')
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain('Party not found')
    })

    it('returns 410 when party has expired', async () => {
      mockPartySingle.mockResolvedValueOnce({
        data: {
          id: 'party-id-123',
          code: 'ABC123',
          expires_at: new Date(Date.now() - 86400000).toISOString(),
        },
        error: null,
      })
      const { POST } = await import('./route')
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(410)
      const body = await response.json()
      expect(body.error).toContain('expired')
    })
  })

  describe('Successful Requests', () => {
    it('sends invitation and returns success with emailId', async () => {
      const { POST } = await import('./route')
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Invitation sent successfully')
      expect(body.emailId).toBe('email-id-123')
    })

    it('passes personalMessage to sendPartyInvitation when provided', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, personalMessage: 'Come join us!' })
      await POST(request)
      expect(mockSendPartyInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ personalMessage: 'Come join us!' }),
      )
    })

    it('uppercases the party code before sending', async () => {
      const { POST } = await import('./route')
      const request = createRequest({ ...validBody, partyCode: 'abc123' })
      await POST(request)
      expect(mockSendPartyInvitation).toHaveBeenCalledWith(expect.objectContaining({ partyCode: 'ABC123' }))
    })

    it('skips party verification when Supabase credentials are missing', async () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }
      const { POST } = await import('./route')
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('Email Sending Failures', () => {
    it('returns 500 when email sending fails', async () => {
      mockSendPartyInvitation.mockResolvedValueOnce({ success: false, error: 'SMTP error' })
      const { POST } = await import('./route')
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('SMTP error')
    })

    it('returns 500 with generic message when email fails without error detail', async () => {
      mockSendPartyInvitation.mockResolvedValueOnce({ success: false })
      const { POST } = await import('./route')
      const request = createRequest(validBody)
      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toContain('Failed to send invitation')
    })
  })
})
