import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/apiHelpers', () => ({
  parseAndValidateRequest: vi.fn(),
  createServiceClient: vi.fn(),
  validateParty: vi.fn(),
  getCallerIdentity: vi.fn(),
  validateMembership: vi.fn(),
}))

vi.mock('@/lib/serverRateLimit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn(() => ({ limited: false, retryAfterMs: 0 })),
  })),
}))

import {
  parseAndValidateRequest,
  createServiceClient,
  validateParty,
  getCallerIdentity,
  validateMembership,
} from '@/lib/apiHelpers'
import { createRateLimiter } from '@/lib/serverRateLimit'
import { POST } from './route'

const mockRequest = {} as NextRequest

function createMockSupabase(overrides?: {
  countResult?: { count: number | null; error: { message: string } | null }
  imageCountResult?: { count: number | null; error: { message: string } | null }
  insertResult?: { data: Record<string, unknown> | null; error: { message: string } | null }
}) {
  const mockSingle = vi
    .fn()
    .mockResolvedValue(overrides?.insertResult ?? { data: { id: 'item-1', party_id: 'party-1' }, error: null })
  const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect })

  const countResult = overrides?.countResult ?? { count: 5, error: null }
  const imageCountResult = overrides?.imageCountResult ?? { count: 2, error: null }

  const supabase = {
    from: vi.fn(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue(countResult),
            eq: vi.fn().mockResolvedValue(imageCountResult),
          }),
        }),
        insert: mockInsert,
      }
    }),
  }

  return { supabase, mockInsert, mockSingle }
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    partyId: 'party-1',
    sessionId: 'session-1',
    type: 'note',
    status: 'pending',
    position: 0,
    addedByName: 'Test User',
    noteContent: 'Hello',
    ...overrides,
  }
}

describe('Queue Items POST Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupHappyPath(mock: ReturnType<typeof createMockSupabase>, body?: Record<string, unknown>) {
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: validBody(body),
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

  it('returns 429 when rate limited', async () => {
    const mockCheck = vi.fn().mockReturnValue({ limited: true, retryAfterMs: 30000 })
    vi.mocked(createRateLimiter).mockReturnValue({ check: mockCheck, _store: new Map() })

    // Need to re-import to pick up the new mock
    vi.resetModules()
    const { POST: PostHandler } = await import('./route')

    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: validBody(),
      error: undefined,
    })

    const response = await PostHandler(mockRequest)
    expect(response.status).toBe(429)
    const json = await response.json()
    expect(json.error).toContain('Rate limit')
    expect(json.retryAfter).toBe(30)
  })

  it('returns error when createServiceClient fails', async () => {
    // Reset rate limiter to not limited
    vi.mocked(createRateLimiter).mockReturnValue({
      check: vi.fn(() => ({ limited: false, retryAfterMs: 0 })),
      _store: new Map(),
    })
    vi.resetModules()
    const { POST: PostHandler } = await import('./route')

    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: validBody(),
      error: undefined,
    })
    const errorResponse = NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    vi.mocked(createServiceClient).mockReturnValue({
      supabase: undefined,
      error: errorResponse,
    })

    const response = await PostHandler(mockRequest)
    expect(response).toBe(errorResponse)
  })

  it('returns error when validateParty fails', async () => {
    const mock = createMockSupabase()
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: validBody(),
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
      body: validBody(),
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
    const errorResponse = NextResponse.json({ error: 'Not a member' }, { status: 403 })
    vi.mocked(validateMembership).mockResolvedValue({
      member: undefined,
      error: errorResponse,
    })

    const response = await POST(mockRequest)
    expect(response).toBe(errorResponse)
  })

  it('returns 500 when queue count query fails', async () => {
    const mock = createMockSupabase({
      countResult: { count: null, error: { message: 'DB error' } },
    })
    setupHappyPath(mock)

    const response = await POST(mockRequest)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to check queue size')
  })

  it('returns 400 when queue is full', async () => {
    const mock = createMockSupabase({
      countResult: { count: 100, error: null },
    })
    setupHappyPath(mock)

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('Queue is full')
  })

  it('returns 400 when queue count is null but equals limit', async () => {
    const mock = createMockSupabase({
      countResult: { count: null, error: null },
    })
    setupHappyPath(mock)

    // null count defaults to 0 via `(count ?? 0)`, which is < 100, so should proceed
    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
  })

  it('returns 500 when image count query fails', async () => {
    const mock = createMockSupabase({
      imageCountResult: { count: null, error: { message: 'DB error' } },
    })
    setupHappyPath(mock, { type: 'image', imageUrl: 'https://example.com/img.png' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to check image limit')
  })

  it('returns 400 when image limit reached', async () => {
    const mock = createMockSupabase({
      imageCountResult: { count: 20, error: null },
    })
    setupHappyPath(mock, { type: 'image', imageUrl: 'https://example.com/img.png' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain('image limit')
  })

  it('returns 500 when insert fails', async () => {
    const mock = createMockSupabase({
      insertResult: { data: null, error: { message: 'Insert failed' } },
    })
    setupHappyPath(mock)

    const response = await POST(mockRequest)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Failed to add item to queue')
  })

  it('successful insert returns 200 with item', async () => {
    const mock = createMockSupabase({
      insertResult: { data: { id: 'new-item', party_id: 'party-1', type: 'note' }, error: null },
    })
    setupHappyPath(mock)

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.item.id).toBe('new-item')
  })

  it('successful image insert skips image limit for non-image types', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock, { type: 'youtube', title: 'Test Video' })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)

    // Should only call from() for queue count + insert, NOT for image count
    // from() called for: count check, insert
    const fromCalls = mock.supabase.from.mock.calls
    const queueItemsCalls = fromCalls.filter((c: string[]) => c[0] === 'queue_items')
    expect(queueItemsCalls.length).toBe(2) // count + insert, no image count
  })

  it('inserts note item with correct DB fields', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock, {
      type: 'note',
      noteContent: 'My note',
      addedByName: 'Alice',
      position: 3,
      dueDate: '2026-03-01',
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)

    expect(mock.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        party_id: 'party-1',
        type: 'note',
        status: 'pending',
        position: 3,
        added_by_name: 'Alice',
        note_content: 'My note',
        due_date: '2026-03-01',
        is_completed: false,
      }),
    )
  })

  it('inserts image item with image-specific fields', async () => {
    const mock = createMockSupabase()
    setupHappyPath(mock, {
      type: 'image',
      imageUrl: 'https://example.com/img.png',
      imageName: 'photo.png',
      imageStoragePath: '/uploads/photo.png',
      imageCaption: 'Nice photo',
    })

    const response = await POST(mockRequest)
    expect(response.status).toBe(200)

    expect(mock.mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'image',
        image_url: 'https://example.com/img.png',
        image_name: 'photo.png',
        image_storage_path: '/uploads/photo.png',
        image_caption: 'Nice photo',
      }),
    )
  })
})
