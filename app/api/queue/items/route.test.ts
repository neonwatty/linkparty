import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'test-party-123', expires_at: new Date(Date.now() + 86400000).toISOString() },
              error: null,
            }),
          ),
          neq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'new-item-123', party_id: 'test-party-123' },
              error: null,
            }),
          ),
        })),
      })),
    })),
  })),
}))

// Store original env
const originalEnv = process.env

describe('Queue Items API Route', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost:3000/api/queue/items', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000' },
    })
  }

  describe('Request Validation', () => {
    it('returns 400 for missing partyId', async () => {
      const request = createRequest({
        sessionId: 'session-123',
        type: 'note',
        status: 'pending',
        position: 0,
        addedByName: 'Test User',
        noteContent: 'Test note',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('partyId')
    })

    it('returns 400 for missing sessionId', async () => {
      const request = createRequest({
        partyId: 'party-123',
        type: 'note',
        status: 'pending',
        position: 0,
        addedByName: 'Test User',
        noteContent: 'Test note',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('sessionId')
    })

    it('returns 400 for invalid type', async () => {
      const request = createRequest({
        partyId: 'party-123',
        sessionId: 'session-123',
        type: 'invalid',
        status: 'pending',
        position: 0,
        addedByName: 'Test User',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('type')
    })

    it('returns 400 for invalid status', async () => {
      const request = createRequest({
        partyId: 'party-123',
        sessionId: 'session-123',
        type: 'note',
        status: 'invalid',
        position: 0,
        addedByName: 'Test User',
        noteContent: 'Test note',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('status')
    })

    it('returns 400 for missing addedByName', async () => {
      const request = createRequest({
        partyId: 'party-123',
        sessionId: 'session-123',
        type: 'note',
        status: 'pending',
        position: 0,
        noteContent: 'Test note',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('addedByName')
    })

    it('returns 400 for note type without content', async () => {
      const request = createRequest({
        partyId: 'party-123',
        sessionId: 'session-123',
        type: 'note',
        status: 'pending',
        position: 0,
        addedByName: 'Test User',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Note content')
    })

    it('returns 400 for image type without URL', async () => {
      const request = createRequest({
        partyId: 'party-123',
        sessionId: 'session-123',
        type: 'image',
        status: 'pending',
        position: 0,
        addedByName: 'Test User',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Image URL')
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when service key is not configured', async () => {
      // Reset env to remove service key
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }

      const request = createRequest({
        partyId: 'party-123',
        sessionId: 'session-123',
        type: 'note',
        status: 'pending',
        position: 0,
        addedByName: 'Test User',
        noteContent: 'Test note',
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Server configuration error')
    })
  })
})
