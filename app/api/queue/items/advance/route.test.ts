import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

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
import type { NextRequest } from 'next/server'

// --- Supabase chain mock ---
function createMockSupabase() {
  const eqResult = { error: null }
  const mockEq = vi.fn(() => Promise.resolve(eqResult))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))

  const supabase = {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  }

  return { supabase, mockUpdate, mockEq }
}

const mockRequest = {} as NextRequest

describe('Queue Items Advance API Route', () => {
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

  it('returns error when parseAndValidateRequest fails (CSRF)', async () => {
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
      body: { partyId: 'party-1', sessionId: 'session-1', showingItemId: 'item-1' },
      error: undefined,
    })
    const errorResponse = NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    vi.mocked(createServiceClient).mockReturnValue({
      supabase: undefined,
      error: errorResponse,
    })

    const response = await POST(mockRequest)
    expect(response).toBe(errorResponse)
    expect(validateParty).not.toHaveBeenCalled()
  })

  it('returns error when validateParty fails', async () => {
    const mock = createMockSupabase()
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: { partyId: 'party-1', sessionId: 'session-1', showingItemId: 'item-1' },
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
      body: { partyId: 'party-1', sessionId: 'session-1', showingItemId: 'item-1' },
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

  it('marks showing item as shown', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: { partyId: 'party-1', sessionId: 'session-1', showingItemId: 'show-item-1' },
      error: undefined,
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)

    expect(mock.supabase.from).toHaveBeenCalledWith('queue_items')
    expect(mock.mockUpdate).toHaveBeenCalledWith({ status: 'shown' })
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'show-item-1')
  })

  it('marks pending item as showing', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: { partyId: 'party-1', sessionId: 'session-1', firstPendingItemId: 'pending-item-1' },
      error: undefined,
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)

    expect(mock.mockUpdate).toHaveBeenCalledWith({ status: 'showing' })
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'pending-item-1')
  })

  it('handles both transitions at once', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        showingItemId: 'show-item-1',
        firstPendingItemId: 'pending-item-1',
      },
      error: undefined,
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)

    // Should have called from('queue_items') twice
    expect(mock.supabase.from).toHaveBeenCalledTimes(2)
    expect(mock.mockUpdate).toHaveBeenCalledWith({ status: 'shown' })
    expect(mock.mockUpdate).toHaveBeenCalledWith({ status: 'showing' })
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'show-item-1')
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'pending-item-1')
  })

  it('DB update failure on showing item returns 500', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: { partyId: 'party-1', sessionId: 'session-1', showingItemId: 'show-item-1' },
      error: undefined,
    })
    mock.mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB write failed' } }))

    const response = await POST(mockRequest)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to advance queue')
  })

  it('DB update failure on pending item returns 500', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock)
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: { partyId: 'party-1', sessionId: 'session-1', firstPendingItemId: 'pending-item-1' },
      error: undefined,
    })
    mock.mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB write failed' } }))

    const response = await POST(mockRequest)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to advance queue')
  })
})
