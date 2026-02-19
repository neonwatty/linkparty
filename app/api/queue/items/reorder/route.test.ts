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

// --- Supabase chain mock with per-call result control ---
function createMockSupabase(eqResults?: Array<{ error: { message: string } | null }>) {
  let callIndex = 0
  const mockEq = vi.fn(() => {
    if (eqResults && callIndex < eqResults.length) {
      return Promise.resolve(eqResults[callIndex++])
    }
    return Promise.resolve({ error: null })
  })
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))

  const supabase = {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  }

  return { supabase, mockUpdate, mockEq }
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

  it('successful reorder with multiple items', async () => {
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
    expect(json.partialErrors).toBeUndefined()

    // Should update position for each item
    expect(mock.supabase.from).toHaveBeenCalledTimes(3)
    expect(mock.mockUpdate).toHaveBeenCalledWith({ position: 0 })
    expect(mock.mockUpdate).toHaveBeenCalledWith({ position: 1 })
    expect(mock.mockUpdate).toHaveBeenCalledWith({ position: 2 })
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'item-a')
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'item-b')
    expect(mock.mockEq).toHaveBeenCalledWith('id', 'item-c')
  })

  it('partial errors: some updates succeed, some fail', async () => {
    const mock = createMockSupabase([
      { error: null }, // item-a succeeds
      { error: { message: 'Row not found' } }, // item-b fails
      { error: null }, // item-c succeeds
    ])
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
    expect(json.partialErrors).toHaveLength(1)
    expect(json.partialErrors[0]).toEqual({ id: 'item-b', error: 'Row not found' })
  })

  it('all succeed returns clean success without partialErrors', async () => {
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
    expect(json.partialErrors).toBeUndefined()
  })
})
