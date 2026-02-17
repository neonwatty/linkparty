import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatRetryTime, getRateLimitMessage, checkRateLimit, recordAttempt, tryAction } from './rateLimit'

vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}))

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
  })

  describe('formatRetryTime', () => {
    it('formats milliseconds as "a moment"', () => {
      expect(formatRetryTime(500)).toBe('a moment')
      expect(formatRetryTime(999)).toBe('a moment')
    })

    it('formats seconds correctly', () => {
      expect(formatRetryTime(1000)).toBe('1 second')
      expect(formatRetryTime(5000)).toBe('5 seconds')
      expect(formatRetryTime(59000)).toBe('59 seconds')
    })

    it('formats minutes correctly', () => {
      expect(formatRetryTime(60000)).toBe('1 minute')
      expect(formatRetryTime(120000)).toBe('2 minutes')
      expect(formatRetryTime(59 * 60000)).toBe('59 minutes')
    })

    it('formats hours correctly', () => {
      expect(formatRetryTime(3600000)).toBe('1 hour')
      expect(formatRetryTime(7200000)).toBe('2 hours')
    })
  })

  describe('getRateLimitMessage', () => {
    it('returns appropriate message for queueItem', () => {
      const message = getRateLimitMessage('queueItem', 30000)
      expect(message).toContain('Too many items added')
      expect(message).toContain('30 seconds')
    })

    it('returns appropriate message for partyCreation', () => {
      const message = getRateLimitMessage('partyCreation', 3600000)
      expect(message).toContain('Too many parties created')
      expect(message).toContain('1 hour')
    })

    it('returns appropriate message for imageUpload', () => {
      const message = getRateLimitMessage('imageUpload', 60000)
      expect(message).toContain('Too many images uploaded')
      expect(message).toContain('1 minute')
    })
  })

  describe('checkRateLimit', () => {
    it('returns not limited when no timestamps in storage', () => {
      const result = checkRateLimit('queueItem')
      expect(result.isLimited).toBe(false)
      expect(result.remainingAttempts).toBe(10)
      expect(result.retryAfterMs).toBe(0)
    })

    it('returns not limited when attempts are below max', () => {
      const now = Date.now()
      const timestamps = [now - 1000, now - 2000, now - 3000]
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps }))

      const result = checkRateLimit('queueItem')
      expect(result.isLimited).toBe(false)
      expect(result.remainingAttempts).toBe(7)
      expect(result.retryAfterMs).toBe(0)
    })

    it('returns limited when attempts reach max', () => {
      const now = Date.now()
      const timestamps = Array.from({ length: 10 }, (_, i) => now - i * 1000)
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps }))

      const result = checkRateLimit('queueItem')
      expect(result.isLimited).toBe(true)
      expect(result.remainingAttempts).toBe(0)
    })

    it('returns correct remainingAttempts count', () => {
      const now = Date.now()
      const timestamps = [now - 1000, now - 2000, now - 3000, now - 4000, now - 5000]
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps }))

      const result = checkRateLimit('imageUpload')
      // imageUpload maxAttempts is 5, so 5 timestamps means 0 remaining
      expect(result.isLimited).toBe(true)
      expect(result.remainingAttempts).toBe(0)

      // With 3 timestamps for imageUpload (max 5)
      const threeTimestamps = [now - 1000, now - 2000, now - 3000]
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps: threeTimestamps }))

      const result2 = checkRateLimit('imageUpload')
      expect(result2.isLimited).toBe(false)
      expect(result2.remainingAttempts).toBe(2)
    })

    it('cleans up expired timestamps from storage', () => {
      const now = Date.now()
      // queueItem windowMs is 60_000 (1 minute)
      // Mix of fresh (within window) and expired (outside window) timestamps
      const timestamps = [now - 500, now - 1000, now - 120_000, now - 200_000]
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps }))

      const result = checkRateLimit('queueItem')
      // Only 2 timestamps are within the 60s window
      expect(result.isLimited).toBe(false)
      expect(result.remainingAttempts).toBe(8)
      // Should save cleaned timestamps back since lengths differ
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'link-party-rate-limit-queueItem',
        expect.stringContaining('"timestamps"'),
      )
    })

    it('returns retryAfterMs when limited', () => {
      const now = Date.now()
      // 10 timestamps all within the last 30 seconds for queueItem (windowMs = 60_000)
      const timestamps = Array.from({ length: 10 }, (_, i) => now - i * 3000)
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps }))

      const result = checkRateLimit('queueItem')
      expect(result.isLimited).toBe(true)
      // retryAfterMs should be > 0 (time until oldest timestamp expires from the window)
      expect(result.retryAfterMs).toBeGreaterThan(0)
      // The oldest is now - 27_000, so retryAfterMs should be around 60_000 - 27_000 = 33_000
      expect(result.retryAfterMs).toBeLessThanOrEqual(60_000)
    })
  })

  describe('recordAttempt', () => {
    it('stores a timestamp in localStorage', () => {
      recordAttempt('queueItem')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'link-party-rate-limit-queueItem',
        expect.stringContaining('"timestamps"'),
      )
      // Verify the stored value contains a recent timestamp
      const call = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0]
      const stored = JSON.parse(call[1])
      expect(stored.timestamps).toHaveLength(1)
      expect(stored.timestamps[0]).toBeCloseTo(Date.now(), -2)
    })

    it('appends to existing timestamps', () => {
      const now = Date.now()
      const existingTimestamps = [now - 1000, now - 2000]
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ timestamps: existingTimestamps }),
      )

      recordAttempt('queueItem')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'link-party-rate-limit-queueItem',
        expect.stringContaining('"timestamps"'),
      )
      const call = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls[0]
      const stored = JSON.parse(call[1])
      expect(stored.timestamps).toHaveLength(3)
    })
  })

  describe('tryAction', () => {
    it('returns null when action is allowed', () => {
      const result = tryAction('queueItem')
      expect(result).toBeNull()
    })

    it('records the attempt when allowed', () => {
      tryAction('queueItem')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'link-party-rate-limit-queueItem',
        expect.stringContaining('"timestamps"'),
      )
    })

    it('returns error message when rate limited', () => {
      const now = Date.now()
      const timestamps = Array.from({ length: 10 }, (_, i) => now - i * 1000)
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ timestamps }))

      const result = tryAction('queueItem')
      expect(result).not.toBeNull()
      expect(result).toContain('Too many items added')
    })
  })
})
