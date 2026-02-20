import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger before importing the module
vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// Store original env
const originalEnv = process.env

describe('fetchContentMetadata', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  async function loadModule() {
    return import('./contentMetadata')
  }

  describe('mock mode (no Supabase configured)', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })

    it('returns YouTube mock data for youtube.com URLs', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://www.youtube.com/watch?v=abc123')
      expect(result.success).toBe(true)
      expect(result.type).toBe('youtube')
      expect(result.data?.title).toBe('Sample YouTube Video')
      expect(result.data?.channel).toBe('Sample Channel')
    })

    it('returns YouTube mock data for youtu.be URLs', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtu.be/abc123')
      expect(result.success).toBe(true)
      expect(result.type).toBe('youtube')
    })

    it('returns tweet mock data for twitter.com URLs', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://twitter.com/user/status/123')
      expect(result.success).toBe(true)
      expect(result.type).toBe('tweet')
      expect(result.data?.tweetAuthor).toBe('Sample User')
      expect(result.data?.tweetHandle).toBe('@sampleuser')
    })

    it('returns tweet mock data for x.com URLs', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://x.com/user/status/123')
      expect(result.success).toBe(true)
      expect(result.type).toBe('tweet')
    })

    it('returns Reddit mock data for reddit.com URLs', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://www.reddit.com/r/test/comments/abc')
      expect(result.success).toBe(true)
      expect(result.type).toBe('reddit')
      expect(result.data?.subreddit).toBe('r/sample')
      expect(result.data?.upvotes).toBe(1234)
    })

    it('returns error for unsupported URLs', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://example.com/page')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unsupported URL type')
    })

    it('is case-insensitive for URL matching', async () => {
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://WWW.YOUTUBE.COM/watch?v=abc')
      expect(result.success).toBe(true)
      expect(result.type).toBe('youtube')
    })

    it('returns mock data when URL contains placeholder', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'
      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtube.com/watch?v=test')
      expect(result.success).toBe(true)
      expect(result.type).toBe('youtube')
    })
  })

  describe('real mode (Supabase configured)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
    })

    it('calls the edge function with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, type: 'youtube', data: { title: 'Real Video' } }),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtube.com/watch?v=real')

      expect(global.fetch).toHaveBeenCalledWith('https://test.supabase.co/functions/v1/fetch-content-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=real' }),
      })
      expect(result.success).toBe(true)
    })

    it('handles HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtube.com/watch?v=fail')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Server error')
    })

    it('handles HTTP error with non-JSON response', async () => {
      const mockResponse = {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new Error('not json')),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtube.com/watch?v=fail')

      expect(result.success).toBe(false)
      expect(result.error).toBe('HTTP 502: Bad Gateway')
    })

    it('handles network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'))

      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtube.com/watch?v=timeout')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })

    it('handles non-Error thrown values', async () => {
      global.fetch = vi.fn().mockRejectedValue('string error')

      const { fetchContentMetadata } = await loadModule()
      const result = await fetchContentMetadata('https://youtube.com/watch?v=weird')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('in-memory cache', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
    })

    it('returns cached data on second call without hitting fetch', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, type: 'youtube', data: { title: 'Cached Video' } }),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Use a single module import so the Map persists between calls
      const { fetchContentMetadata } = await loadModule()

      const first = await fetchContentMetadata('https://youtube.com/watch?v=cache-test')
      expect(first.success).toBe(true)
      expect(first.data?.title).toBe('Cached Video')
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Second call — should return from cache, not fetch
      const second = await fetchContentMetadata('https://youtube.com/watch?v=cache-test')
      expect(second.success).toBe(true)
      expect(second.data?.title).toBe('Cached Video')
      expect(global.fetch).toHaveBeenCalledTimes(1) // still 1
    })

    it('does not cache failed responses', async () => {
      const failResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      }
      const successResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, type: 'youtube', data: { title: 'Retry Success' } }),
      }
      global.fetch = vi.fn().mockResolvedValueOnce(failResponse).mockResolvedValueOnce(successResponse)

      const { fetchContentMetadata } = await loadModule()

      const first = await fetchContentMetadata('https://youtube.com/watch?v=fail-then-succeed')
      expect(first.success).toBe(false)

      // Second call should hit fetch again since failure wasn't cached
      const second = await fetchContentMetadata('https://youtube.com/watch?v=fail-then-succeed')
      expect(second.success).toBe(true)
      expect(second.data?.title).toBe('Retry Success')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('fetches again after cache TTL expires', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true, type: 'youtube', data: { title: 'Fresh Data' } }),
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const { fetchContentMetadata } = await loadModule()

      await fetchContentMetadata('https://youtube.com/watch?v=ttl-test')
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Advance time past the 10-minute TTL
      vi.useFakeTimers()
      vi.advanceTimersByTime(11 * 60 * 1000)

      await fetchContentMetadata('https://youtube.com/watch?v=ttl-test')
      expect(global.fetch).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })
})
