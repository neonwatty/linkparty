import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks for the apiHelpers functions
const mockParseAndValidateRequest = vi.fn()
const mockCreateServiceClient = vi.fn()
const mockValidateParty = vi.fn()
const mockGetCallerIdentity = vi.fn()
const mockValidateMembership = vi.fn()

// Mock the delete chain
const mockDeleteResult = vi.fn()
const mockDeleteEq = vi.fn()

vi.mock('@/lib/apiHelpers', () => ({
  parseAndValidateRequest: (...args: unknown[]) => mockParseAndValidateRequest(...args),
  createServiceClient: () => mockCreateServiceClient(),
  validateParty: (...args: unknown[]) => mockValidateParty(...args),
  getCallerIdentity: (...args: unknown[]) => mockGetCallerIdentity(...args),
  validateMembership: (...args: unknown[]) => mockValidateMembership(...args),
}))

const createRequest = (body: object, includeAuth = true) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', origin: 'http://localhost:3000' }
  if (includeAuth) headers['Authorization'] = 'Bearer test-token'
  return new NextRequest('http://localhost:3000/api/party-members/leave', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

// Helper to create mock NextResponse for error cases
function mockErrorResponse(status: number, errorMsg: string) {
  return new Response(JSON.stringify({ error: errorMsg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Party Members Leave API', () => {
  let mockSupabase: {
    from: Mock
    auth: { getUser: Mock }
  }

  beforeEach(() => {
    // Build a mock supabase that supports delete().eq().eq() chain
    mockDeleteResult.mockResolvedValue({ error: null })
    mockDeleteEq.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        then: vi.fn((resolve: (v: unknown) => void) => resolve(mockDeleteResult())),
      }),
    })

    mockSupabase = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: mockDeleteEq,
            then: vi.fn((resolve: (v: unknown) => void) => resolve(mockDeleteResult())),
          })),
        })),
      })),
      auth: { getUser: vi.fn() },
    }

    // Default happy-path mocks
    mockParseAndValidateRequest.mockResolvedValue({
      body: { partyId: 'party-123', sessionId: 'sess-abc' },
    })
    mockCreateServiceClient.mockReturnValue({ supabase: mockSupabase })
    mockValidateParty.mockResolvedValue({ party: { id: 'party-123', expires_at: '2999-01-01' } })
    mockGetCallerIdentity.mockResolvedValue({ userId: 'user-123', sessionId: 'sess-abc' })
    mockValidateMembership.mockResolvedValue({ member: { id: 'member-1' } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('returns error when CSRF/parsing fails (e.g., missing origin)', async () => {
      const errorResp = mockErrorResponse(403, 'Forbidden')
      mockParseAndValidateRequest.mockResolvedValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1', sessionId: 's1' }))
      expect(response.status).toBe(403)
    })

    it('returns 400 when partyId is missing', async () => {
      const errorResp = mockErrorResponse(400, 'Missing or invalid partyId')
      mockParseAndValidateRequest.mockResolvedValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({}))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid partyId')
    })

    it('returns 400 when sessionId is missing', async () => {
      const errorResp = mockErrorResponse(400, 'Missing or invalid sessionId')
      mockParseAndValidateRequest.mockResolvedValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1' }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Missing or invalid sessionId')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when service client creation fails', async () => {
      const errorResp = mockErrorResponse(500, 'Server configuration error')
      mockCreateServiceClient.mockReturnValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1', sessionId: 's1' }))
      expect(response.status).toBe(500)
    })
  })

  describe('Party Validation', () => {
    it('returns 404 when party does not exist', async () => {
      const errorResp = mockErrorResponse(404, 'Party not found')
      mockValidateParty.mockResolvedValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'nonexistent', sessionId: 's1' }))
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('Party not found')
    })

    it('returns 410 when party has expired', async () => {
      const errorResp = mockErrorResponse(410, 'This party has expired')
      mockValidateParty.mockResolvedValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'expired-party', sessionId: 's1' }))
      expect(response.status).toBe(410)
    })
  })

  describe('Membership Validation', () => {
    it('returns 403 when user is not a member of the party', async () => {
      const errorResp = mockErrorResponse(403, 'You must be a member of this party')
      mockValidateMembership.mockResolvedValueOnce({ error: errorResp })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'p1', sessionId: 's1' }))
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('You must be a member of this party')
    })
  })

  describe('Successful Leave', () => {
    it('returns success:true when member is deleted by userId', async () => {
      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'party-123', sessionId: 'sess-abc' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('deletes by sessionId when user is not authenticated', async () => {
      mockGetCallerIdentity.mockResolvedValueOnce({ sessionId: 'sess-anon' })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'party-123', sessionId: 'sess-anon' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when delete query fails', async () => {
      mockDeleteResult.mockResolvedValueOnce({ error: { message: 'delete failed' } })
      // Need to set up supabase mock to return error on the delete chain
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: { message: 'delete failed' } }),
          })),
        })),
      })

      const { POST } = await import('./route')
      const response = await POST(createRequest({ partyId: 'party-123', sessionId: 'sess-abc' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to leave party')
    })
  })
})
