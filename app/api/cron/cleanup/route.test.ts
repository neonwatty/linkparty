import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockFrom = vi.fn()
const mockStorageRemove = vi.fn()

// Terminal mocks for each operation
const mockPartiesSelectLimit = vi.fn()
const mockPartiesDeleteIn = vi.fn()
const mockQueueItemsNot = vi.fn()
const mockInviteTokensSelect = vi.fn()
const mockNotificationsSelect = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      const table = args[0] as string

      if (table === 'parties') {
        // Return an object that supports both select-chain and delete-chain
        return {
          // Select chain: .select('id').lt(...).limit(BATCH_SIZE)
          select: vi.fn(() => ({
            lt: vi.fn(() => ({
              limit: mockPartiesSelectLimit,
            })),
          })),
          // Delete chain: .delete().in('id', partyIds)
          delete: vi.fn(() => ({
            in: mockPartiesDeleteIn,
          })),
        }
      }
      if (table === 'queue_items') {
        // .select('image_storage_path').in('party_id', partyIds).not(...)
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: mockQueueItemsNot,
            })),
          })),
        }
      }
      if (table === 'invite_tokens') {
        // .delete().lt('expires_at', ...).select('id')
        return {
          delete: vi.fn(() => ({
            lt: vi.fn(() => ({
              select: mockInviteTokensSelect,
            })),
          })),
        }
      }
      if (table === 'notifications') {
        // .delete().eq('read', true).lt('created_at', ...).select('id')
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              lt: vi.fn(() => ({
                select: mockNotificationsSelect,
              })),
            })),
          })),
        }
      }
      return {}
    },
    storage: {
      from: vi.fn(() => ({
        remove: mockStorageRemove,
      })),
    },
  })),
}))

const originalEnv = process.env

const createRequest = (token?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost:3000/api/cron/cleanup', {
    method: 'GET',
    headers,
  })
}

describe('Cron Cleanup API', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'test-cron-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }
    // Default: no expired parties (empty result stops the while loop immediately)
    mockPartiesSelectLimit.mockResolvedValue({ data: [], error: null })
    mockPartiesDeleteIn.mockResolvedValue({ error: null })
    mockQueueItemsNot.mockResolvedValue({ data: [], error: null })
    mockStorageRemove.mockResolvedValue({ error: null })
    mockInviteTokensSelect.mockResolvedValue({ data: [], error: null })
    mockNotificationsSelect.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 without authorization header', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest())
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 with wrong token', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest('wrong-secret'))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when CRON_SECRET env var is not set', async () => {
      process.env = { ...process.env, CRON_SECRET: undefined }
      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(401)
    })
  })

  describe('Server Configuration', () => {
    it('returns 500 when Supabase env vars are missing', async () => {
      process.env = {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }
      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Supabase not configured')
    })
  })

  describe('Successful Cleanup', () => {
    it('returns success with zero counts when no expired parties', async () => {
      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.deletedCount).toBe(0)
      expect(body.imagesDeleted).toBe(0)
      expect(body.tokensDeleted).toBe(0)
      expect(body.notificationsDeleted).toBe(0)
    })

    it('deletes expired parties and returns correct counts', async () => {
      // First select returns 2 expired parties (< BATCH_SIZE so loop ends after 1 iteration)
      mockPartiesSelectLimit.mockResolvedValueOnce({
        data: [{ id: 'party-1' }, { id: 'party-2' }],
        error: null,
      })
      mockPartiesDeleteIn.mockResolvedValue({ error: null })
      mockQueueItemsNot.mockResolvedValue({ data: [], error: null })
      mockInviteTokensSelect.mockResolvedValue({ data: [{ id: 'tok-1' }], error: null })
      mockNotificationsSelect.mockResolvedValue({ data: [{ id: 'notif-1' }, { id: 'notif-2' }], error: null })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.deletedCount).toBe(2)
      expect(body.tokensDeleted).toBe(1)
      expect(body.notificationsDeleted).toBe(2)
    })

    it('deletes images from storage for expired parties', async () => {
      mockPartiesSelectLimit.mockResolvedValueOnce({
        data: [{ id: 'party-1' }],
        error: null,
      })
      mockQueueItemsNot.mockResolvedValueOnce({
        data: [{ image_storage_path: 'images/img1.jpg' }, { image_storage_path: 'images/img2.jpg' }],
        error: null,
      })
      mockStorageRemove.mockResolvedValue({ error: null })
      mockPartiesDeleteIn.mockResolvedValue({ error: null })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.imagesDeleted).toBe(2)
      expect(mockStorageRemove).toHaveBeenCalledWith(['images/img1.jpg', 'images/img2.jpg'])
    })
  })

  describe('Error Handling', () => {
    it('returns 500 when fetching expired parties fails', async () => {
      mockPartiesSelectLimit.mockResolvedValueOnce({ data: null, error: { message: 'db error' } })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch expired parties')
    })

    it('returns 500 when deleting parties fails', async () => {
      mockPartiesSelectLimit.mockResolvedValueOnce({
        data: [{ id: 'party-1' }],
        error: null,
      })
      mockQueueItemsNot.mockResolvedValue({ data: [], error: null })
      mockPartiesDeleteIn.mockResolvedValueOnce({ error: { message: 'delete error' } })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to delete expired parties')
      expect(body.deletedSoFar).toBe(0)
    })

    it('continues party deletion even when storage cleanup fails', async () => {
      mockPartiesSelectLimit.mockResolvedValueOnce({
        data: [{ id: 'party-1' }],
        error: null,
      })
      mockQueueItemsNot.mockResolvedValueOnce({
        data: [{ image_storage_path: 'images/img1.jpg' }],
        error: null,
      })
      mockStorageRemove.mockResolvedValueOnce({ error: { message: 'storage error' } })
      mockPartiesDeleteIn.mockResolvedValue({ error: null })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.deletedCount).toBe(1)
      expect(body.imagesDeleted).toBe(0)
    })

    it('handles invite token delete errors gracefully', async () => {
      mockInviteTokensSelect.mockResolvedValueOnce({ data: null, error: { message: 'token error' } })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.tokensDeleted).toBe(0)
    })

    it('handles notification delete errors gracefully', async () => {
      mockNotificationsSelect.mockResolvedValueOnce({ data: null, error: { message: 'notif error' } })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.notificationsDeleted).toBe(0)
    })
  })

  describe('Batch Processing', () => {
    it('processes multiple batches when first batch is full (50 items)', async () => {
      // Return exactly 50 parties (BATCH_SIZE), triggering another loop iteration
      const fiftyParties = Array.from({ length: 50 }, (_, i) => ({ id: `party-${i}` }))
      mockPartiesSelectLimit
        .mockResolvedValueOnce({ data: fiftyParties, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // Second iteration: empty → loop ends
      mockQueueItemsNot.mockResolvedValue({ data: [], error: null })
      mockPartiesDeleteIn.mockResolvedValue({ error: null })

      const { GET } = await import('./route')
      const response = await GET(createRequest('test-cron-secret'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.deletedCount).toBe(50)
    })
  })
})
