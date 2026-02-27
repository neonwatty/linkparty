import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn(),
      }
    },
  })),
}))

const originalEnv = process.env

describe('Health API', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('HEAD', () => {
    it('returns 200 with no body', async () => {
      const { HEAD } = await import('./route')
      const response = await HEAD()
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('')
    })
  })

  describe('GET', () => {
    it('returns healthy status when database check succeeds', async () => {
      // Make the chain resolve successfully: select → limit → resolves
      const { createClient } = await import('@supabase/supabase-js')
      ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: () => ({
          select: () => ({
            limit: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      const { GET } = await import('./route')
      const response = await GET()
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('healthy')
      expect(body.checks.database).toBe('ok')
      expect(body.timestamp).toBeDefined()
    })

    it('returns degraded status when database check fails', async () => {
      const { createClient } = await import('@supabase/supabase-js')
      ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: () => ({
          select: () => ({
            limit: vi.fn().mockResolvedValue({ error: { message: 'connection error' } }),
          }),
        }),
      })

      const { GET } = await import('./route')
      const response = await GET()
      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.status).toBe('degraded')
      expect(body.checks.database).toBe('error')
      expect(body.timestamp).toBeDefined()
    })

    it('returns degraded when Supabase env vars are missing', async () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      }

      const { GET } = await import('./route')
      const response = await GET()
      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.status).toBe('degraded')
      expect(body.checks.database).toBe('error')
    })

    it('returns degraded when Supabase client throws', async () => {
      const { createClient } = await import('@supabase/supabase-js')
      ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: () => ({
          select: () => ({
            limit: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      })

      const { GET } = await import('./route')
      const response = await GET()
      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.status).toBe('degraded')
      expect(body.checks.database).toBe('error')
    })
  })
})
