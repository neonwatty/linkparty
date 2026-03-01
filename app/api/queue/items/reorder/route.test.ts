import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/apiHelpers', () => ({
  parseAndValidateRequest: vi.fn(),
  createServiceClient: vi.fn(),
  validateParty: vi.fn(),
  getCallerIdentity: vi.fn(),
  validateMembership: vi.fn(),
}))

import {
  parseAndValidateRequest,
  createServiceClient,
  validateParty,
  getCallerIdentity,
  validateMembership,
} from '@/lib/apiHelpers'
import { POST } from './route'

// --- Supabase mock with .rpc() support ---
function createMockSupabase(rpcResult?: { error: { message: string } | null }) {
  const mockRpc = vi.fn().mockResolvedValue(rpcResult ?? { error: null })

  const supabase = { rpc: mockRpc }

  return { supabase, mockRpc }
}

/** Create a NextRequest with a JSON body for validation tests */
function createRequestWithBody(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/queue/items/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  })
}

const mockRequest = {} as NextRequest

describe('Queue Items Reorder API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupHappyPath(mock: ReturnType<typeof createMockSupabase>) {
    vi.mocked(createServiceClient).mockReturnValue({
      supabase: mock.supabase as never,
      error: undefined,
    })
    vi.mocked(validateParty).mockResolvedValue({
      party: { id: 'party-1', expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: undefined,
    })
    vi.mocked(getCallerIdentity).mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-1',
    })
    vi.mocked(validateMembership).mockResolvedValue({
      member: { id: 'member-1' },
      error: undefined,
    })
  }

  it('returns error when parseAndValidateRequest fails', async () => {
    const errorResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: undefined,
      error: errorResponse,
    })

    const response = await POST(mockRequest)
    expect(response).toBe(errorResponse)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('returns error when createServiceClient fails', async () => {
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        updates: [{ id: 'item-1', position: 0 }],
      },
      error: undefined,
    })
    const errorResponse = NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    vi.mocked(createServiceClient).mockReturnValue({
      supabase: undefined,
      error: errorResponse,
    })

    const response = await POST(mockRequest)
    expect(response).toBe(errorResponse)
  })

  it('returns error when validateParty fails', async () => {
    const mock = createMockSupabase()
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        updates: [{ id: 'item-1', position: 0 }],
      },
      error: undefined,
    })
    vi.mocked(createServiceClient).mockReturnValue({
      supabase: mock.supabase as never,
      error: undefined,
    })
    const errorResponse = NextResponse.json({ error: 'Party not found' }, { status: 404 })
    vi.mocked(validateParty).mockResolvedValue({
      party: undefined,
      error: errorResponse,
    })

    const response = await POST(mockRequest)
    expect(response).toBe(errorResponse)
  })

  it('returns error when validateMembership fails', async () => {
    const mock = createMockSupabase()
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        updates: [{ id: 'item-1', position: 0 }],
      },
      error: undefined,
    })
    vi.mocked(createServiceClient).mockReturnValue({
      supabase: mock.supabase as never,
      error: undefined,
    })
    vi.mocked(validateParty).mockResolvedValue({
      party: { id: 'party-1', expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: undefined,
    })
    vi.mocked(getCallerIdentity).mockResolvedValue({ userId: 'user-1', sessionId: 'session-1' })
    const errorResponse = NextResponse.json({ error: 'You must be a member of this party' }, { status: 403 })
    vi.mocked(validateMembership).mockResolvedValue({
      member: undefined,
      error: errorResponse,
    })

    const response = await POST(mockRequest)
    expect(response).toBe(errorResponse)
  })

  it('successful reorder calls RPC with correct params', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        updates: [
          { id: 'item-a', position: 0 },
          { id: 'item-b', position: 1 },
          { id: 'item-c', position: 2 },
        ],
      },
      error: undefined,
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)

    // Should call RPC once with all updates
    expect(mock.mockRpc).toHaveBeenCalledTimes(1)
    expect(mock.mockRpc).toHaveBeenCalledWith('batch_reorder_queue_items', {
      p_party_id: 'party-1',
      p_updates: [
        { id: 'item-a', position: 0 },
        { id: 'item-b', position: 1 },
        { id: 'item-c', position: 2 },
      ],
    })
  })

  it('returns 500 when RPC fails', async () => {
    const mock = createMockSupabase({ error: { message: 'RPC error' } })
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        updates: [
          { id: 'item-a', position: 0 },
          { id: 'item-b', position: 1 },
          { id: 'item-c', position: 2 },
        ],
      },
      error: undefined,
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Reorder failed')
  })

  it('single item reorder succeeds', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        updates: [{ id: 'item-a', position: 0 }],
      },
      error: undefined,
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })

  // ========== VALIDATION TESTS (exercise internal validateReorderRequest) ==========
  describe('validation (validateReorderRequest)', () => {
    function setupValidationPassthrough() {
      vi.mocked(parseAndValidateRequest).mockImplementation(async (request, validate) => {
        const body = await (request as Request).json()
        const error = validate(body)
        if (error) return { body: undefined, error: NextResponse.json({ error }, { status: 400 }) }
        return { body, error: undefined }
      })
    }

    it('rejects missing partyId', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ sessionId: 's1', updates: [{ id: 'i1', position: 0 }] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('partyId')
    })

    it('rejects non-string partyId', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 123, sessionId: 's1', updates: [{ id: 'i1', position: 0 }] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('partyId')
    })

    it('rejects missing sessionId', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', updates: [{ id: 'i1', position: 0 }] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('sessionId')
    })

    it('rejects missing updates', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1' })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('updates')
    })

    it('rejects empty updates array', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', updates: [] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('updates')
    })

    it('rejects update without id', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', updates: [{ position: 0 }] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('id')
    })

    it('rejects update without position', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', updates: [{ id: 'i1' }] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('position')
    })

    it('rejects update with non-number position', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', updates: [{ id: 'i1', position: 'abc' }] })
      const response = await POST(req)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('position')
    })
  })
})
