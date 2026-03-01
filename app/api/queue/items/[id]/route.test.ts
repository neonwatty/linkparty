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
import { NextRequest } from 'next/server'

// --- Supabase chain mock ---
// Supports two chains:
//   select chain: from().select().eq('id').eq('party_id').single() → ownership check
//   update chain: from().update().eq('id').eq('party_id') → mutation
//   delete chain: from().delete().eq('id').eq('party_id') → deletion
function createMockSupabase(ownershipData?: { added_by_session_id: string } | null) {
  // Update/delete chain
  const eqResult = { error: null }
  const mockEqPartyId = vi.fn(() => Promise.resolve(eqResult))
  const mockEq = vi.fn(() => ({ eq: mockEqPartyId }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockDelete = vi.fn(() => ({ eq: mockEq }))

  // Select chain for ownership check (updateNote)
  const defaultOwnership = ownershipData === undefined ? { added_by_session_id: 'session-1' } : ownershipData
  const mockSingle = vi.fn(() =>
    Promise.resolve({
      data: defaultOwnership,
      error: defaultOwnership === null ? { message: 'Not found' } : null,
    }),
  )
  const mockSelectEqPartyId = vi.fn(() => ({ single: mockSingle }))
  const mockSelectEq = vi.fn(() => ({ eq: mockSelectEqPartyId }))
  const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))

  const supabase = {
    from: vi.fn(() => ({
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
    })),
  }

  return {
    supabase,
    mockUpdate,
    mockDelete,
    mockEq,
    mockEqPartyId,
    eqResult,
    mockSelect,
    mockSelectEq,
    mockSelectEqPartyId,
    mockSingle,
  }
}

const mockParams = { params: Promise.resolve({ id: 'item-123' }) }

/** Create a NextRequest with a JSON body for validation tests */
function createRequestWithBody(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/queue/items/item-123', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  })
}

const mockRequest = {} as NextRequest

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
      expect(mock.mockEqPartyId).toHaveBeenCalledWith('party_id', 'party-1')
    })

    it('updateNote: successful update (owner matches)', async () => {
      const mock = createMockSupabase({ added_by_session_id: 'session-1' })
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Updated note' },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)

      // Verify ownership lookup was performed
      expect(mock.mockSelect).toHaveBeenCalledWith('added_by_session_id')
      expect(mock.mockSelectEq).toHaveBeenCalledWith('id', 'item-123')
      expect(mock.mockSelectEqPartyId).toHaveBeenCalledWith('party_id', 'party-1')
      expect(mock.mockSingle).toHaveBeenCalled()

      expect(mock.mockUpdate).toHaveBeenCalledWith({ note_content: 'Updated note' })
    })

    it('updateNote: returns 403 when non-owner tries to edit', async () => {
      const mock = createMockSupabase({ added_by_session_id: 'other-session' })
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Hijack' },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(403)
      const json = await response.json()
      expect(json.error).toBe('You can only edit notes you created')

      // Update should NOT have been called
      expect(mock.mockUpdate).not.toHaveBeenCalled()
    })

    it('updateNote: returns 404 when queue item not found', async () => {
      const mock = createMockSupabase(null)
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1', action: 'updateNote', noteContent: 'Ghost' },
        error: undefined,
      })

      const response = await PATCH(mockRequest, mockParams)
      expect(response.status).toBe(404)
      const json = await response.json()
      expect(json.error).toBe('Queue item not found')

      expect(mock.mockUpdate).not.toHaveBeenCalled()
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
      // Make the final eq (party_id filter) return an error
      mock.mockEqPartyId.mockReturnValue(Promise.resolve({ error: { message: 'DB write failed' } } as never))

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
      expect(mock.mockEqPartyId).toHaveBeenCalledWith('party_id', 'party-1')
    })

    it('DB delete failure returns 500', async () => {
      const mock = createMockSupabase()
      setupHappyPath(mock)
      vi.mocked(parseAndValidateRequest).mockResolvedValue({
        body: { partyId: 'party-1', sessionId: 'session-1' },
        error: undefined,
      })
      mock.mockEqPartyId.mockReturnValue(Promise.resolve({ error: { message: 'DB delete failed' } } as never))

      const response = await DELETE(mockRequest, mockParams)
      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.error).toBe('Failed to delete item')
    })
  })

  // ========== VALIDATION TESTS (exercise internal validators) ==========
  describe('PATCH validation (validatePatchBody)', () => {
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
      const req = createRequestWithBody({ sessionId: 's1', action: 'updateNote', noteContent: 'Hi' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('partyId')
    })

    it('rejects missing sessionId', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', action: 'updateNote', noteContent: 'Hi' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('sessionId')
    })

    it('rejects missing action', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('action')
    })

    it('rejects invalid action', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', action: 'invalidAction' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('action')
    })

    it('rejects updatePosition without position', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', action: 'updatePosition' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('position')
    })

    it('rejects updateNote without noteContent', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', action: 'updateNote' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('noteContent')
    })

    it('rejects updateNote with noteContent exceeding 5000 chars', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({
        partyId: 'p1',
        sessionId: 's1',
        action: 'updateNote',
        noteContent: 'x'.repeat(5001),
      })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('5000')
    })

    it('rejects toggleComplete without isCompleted', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({ partyId: 'p1', sessionId: 's1', action: 'toggleComplete' })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('isCompleted')
    })

    it('rejects updateDueDate with invalid format', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({
        partyId: 'p1',
        sessionId: 's1',
        action: 'updateDueDate',
        dueDate: 'not-a-date',
      })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('dueDate')
    })

    it('rejects updateDueDate with overly long string', async () => {
      setupValidationPassthrough()
      const req = createRequestWithBody({
        partyId: 'p1',
        sessionId: 's1',
        action: 'updateDueDate',
        dueDate: '2026-03-01T00:00:00.000Z-extra-padding-to-exceed-30-chars',
      })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('dueDate')
    })

    it('accepts valid updateDueDate with null', async () => {
      setupValidationPassthrough()
      const mock = createMockSupabase()
      vi.mocked(createServiceClient).mockReturnValue({ supabase: mock.supabase as never, error: undefined })
      vi.mocked(validateParty).mockResolvedValue({
        party: { id: 'p1', expires_at: new Date(Date.now() + 86400000).toISOString() },
        error: undefined,
      })
      vi.mocked(getCallerIdentity).mockResolvedValue({ userId: 'u1', sessionId: 's1' })
      vi.mocked(validateMembership).mockResolvedValue({ member: { id: 'm1' }, error: undefined })

      const req = createRequestWithBody({
        partyId: 'p1',
        sessionId: 's1',
        action: 'updateDueDate',
        dueDate: null,
      })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(200)
    })

    it('accepts valid updatePosition', async () => {
      setupValidationPassthrough()
      const mock = createMockSupabase()
      vi.mocked(createServiceClient).mockReturnValue({ supabase: mock.supabase as never, error: undefined })
      vi.mocked(validateParty).mockResolvedValue({
        party: { id: 'p1', expires_at: new Date(Date.now() + 86400000).toISOString() },
        error: undefined,
      })
      vi.mocked(getCallerIdentity).mockResolvedValue({ userId: 'u1', sessionId: 's1' })
      vi.mocked(validateMembership).mockResolvedValue({ member: { id: 'm1' }, error: undefined })

      const req = createRequestWithBody({
        partyId: 'p1',
        sessionId: 's1',
        action: 'updatePosition',
        position: 3,
      })
      const response = await PATCH(req, mockParams)
      expect(response.status).toBe(200)
    })
  })

  describe('DELETE validation (validateDeleteBody)', () => {
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
      const req = new NextRequest('http://localhost:3000/api/queue/items/item-123', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ sessionId: 's1' }),
      })
      const response = await DELETE(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('partyId')
    })

    it('rejects missing sessionId', async () => {
      setupValidationPassthrough()
      const req = new NextRequest('http://localhost:3000/api/queue/items/item-123', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
        body: JSON.stringify({ partyId: 'p1' }),
      })
      const response = await DELETE(req, mockParams)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toContain('sessionId')
    })
  })
})
