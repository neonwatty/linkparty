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
import { PATCH, DELETE } from './route'
import type { NextRequest } from 'next/server'

// --- Supabase chain mock ---
function createMockSupabase() {
  const eqResult = { error: null }
  const mockEq = vi.fn(() => Promise.resolve(eqResult))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockDelete = vi.fn(() => ({ eq: mockEq }))

  const supabase = {
    from: vi.fn(() => ({
      update: mockUpdate,
      delete: mockDelete,
    })),
  }

  return { supabase, mockUpdate, mockDelete, mockEq, eqResult }
}

const mockRequest = {} as NextRequest
const mockParams = { params: Promise.resolve({ id: 'item-123' }) }

describe('Queue Items [id] API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Helpers to set up happy path ---
  function setupHappyPath(mock: ReturnType<typeof createMockSupabase>) {
    vi.mocked(parseAndValidateRequest).mockResolvedValue({
      body: {
        partyId: 'party-1',
        sessionId: 'session-1',
        action: 'updateNote',
        noteContent: 'Hello',
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
    vi.mocked(getCallerIdentity).mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-1',
    })
    vi.mocked(validateMembership).mockResolvedValue({
      member: { id: 'member-1' },
      error: undefined,
    })
  }

  // ========== PATCH ==========
  describe('PATCH', () => {
    it('returns helper error when parseAndValidateRequest fails', async () => {
      const errorResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: undefined,
        error: errorResponse,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response).toBe(errorResponse)
      expect(createServiceClient).not.toHaveBeenCalled()
    })

    it('returns helper error when createServiceClient fails', async () => {
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Hi' },
        error: undefined,
      })
      const errorResponse = NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      vi.mocked(createServiceClient).mockReturnValue({
        supabase: undefined,
        error: errorResponse,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response).toBe(errorResponse)
      expect(validateParty).not.toHaveBeenCalled()
    })

    it('returns helper error when validateParty fails', async () => {
      const mock = createMockSupabase()
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Hi' },
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

      const response = await PATCH(mockRequest, mockParams)
      expect(response).toBe(errorResponse)
      expect(getCallerIdentity).not.toHaveBeenCalled()
    })

    it('returns helper error when validateMembership fails', async () => {
      const mock = createMockSupabase()
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Hi' },
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

      const response = await PATCH(mockRequest, mockParams)
      expect(response).toBe(errorResponse)
    })

    it('updatePosition: successful update', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updatePosition', position: 5 },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      expect(mock.supabase.from).toHaveBeenCalledWith('queue_items')
      expect(mock.mockUpdate).toHaveBeenCalledWith({ position: 5 })
      expect(mock.mockEq).toHaveBeenCalledWith('id', 'item-123')
    })

    it('updateNote: successful update', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Updated note' },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      expect(mock.mockUpdate).toHaveBeenCalledWith({ note_content: 'Updated note' })
    })

    it('toggleComplete: successful toggle on (sets completed_at and completed_by_user_id)', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      const now = '2026-02-19T12:00:00.000Z'
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: {
          partyId: 'party-1',
          sessionId: 'session-1',
          action: 'toggleComplete',
          isCompleted: true,
          completedAt: now,
          completedByUserId: 'user-1',
        },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      expect(mock.mockUpdate).toHaveBeenCalledWith({
        is_completed: true,
        completed_at: now,
        completed_by_user_id: 'user-1',
      })
    })

    it('toggleComplete: successful toggle off (clears fields)', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: {
          partyId: 'party-1',
          sessionId: 'session-1',
          action: 'toggleComplete',
          isCompleted: false,
          completedAt: null,
          completedByUserId: null,
        },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      expect(mock.mockUpdate).toHaveBeenCalledWith({
        is_completed: false,
        completed_at: null,
        completed_by_user_id: null,
      })
    })

    it('updateDueDate: successful update', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateDueDate', dueDate: '2026-03-01' },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      expect(mock.mockUpdate).toHaveBeenCalledWith({ due_date: '2026-03-01' })
    })

    it('DB update failure returns 500', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      // Make eq return an error
      mock.mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB write failed' } } as never))

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to update item')
    })
  })

  // ========== DELETE ==========
  describe('DELETE', () => {
    it('returns helper error on validation failure', async () => {
      const errorResponse = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: undefined,
        error: errorResponse,
      })

      const response = await DELETE(mockRequest, mockParams)
      expect(response).toBe(errorResponse)
    })

    it('successful deletion', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1' },
        error: undefined,
      })

      const response = await DELETE(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      expect(mock.supabase.from).toHaveBeenCalledWith('queue_items')
      expect(mock.mockDelete).toHaveBeenCalled()
      expect(mock.mockEq).toHaveBeenCalledWith('id', 'item-123')
    })

    it('DB delete failure returns 500', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1' },
        error: undefined,
      })
      mock.mockEq.mockReturnValue(Promise.resolve({ error: { message: 'DB delete failed' } } as never))

      const response = await DELETE(mockRequest, mockParams)
      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to delete item')
    })
  })
})
