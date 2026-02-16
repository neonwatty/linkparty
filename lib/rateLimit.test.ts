import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkRateLimit,
  recordAttempt,
  formatRetryTime,
  getRateLimitMessage,
  tryAction,
  RATE_LIMITS,
} from './rateLimit'

// The global test setup mocks localStorage with vi.fn().
// We configure return values per test using mockImplementation.
const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.restoreAllMocks()

  // Wire up the global localStorage mock to our storage Map
  ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => storage.get(key) ?? null)
  ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation((key: string, value: string) =>
    storage.set(key, value),
  )
  ;(localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => storage.delete(key))
  ;(localStorage.clear as ReturnType<typeof vi.fn>).mockImplementation(() => storage.clear())
})

describe('RATE_LIMITS', () => {
  it('exports rate limit configurations', () => {
    expect(RATE_LIMITS.queueItem).toEqual({ maxAttempts: 10, windowMs: 60000 })
    expect(RATE_LIMITS.partyCreation).toEqual({ maxAttempts: 3, windowMs: 3600000 })
    expect(RATE_LIMITS.imageUpload).toEqual({ maxAttempts: 5, windowMs: 60000 })
  })
})

describe('checkRateLimit', () => {
  it('returns not limited when no attempts have been made', () => {
    const result = checkRateLimit('queueItem')
    expect(result.isLimited).toBe(false)
    expect(result.remainingAttempts).toBe(10)
    expect(result.retryAfterMs).toBe(0)
  })

  it('returns not limited when attempts are below max', () => {
    // Record 5 attempts for a limit of 10
    for (let i = 0; i < 5; i++) {
      recordAttempt('queueItem')
    }
    const result = checkRateLimit('queueItem')
    expect(result.isLimited).toBe(false)
    expect(result.remainingAttempts).toBe(5)
  })

  it('returns limited when attempts reach max', () => {
    for (let i = 0; i < 10; i++) {
      recordAttempt('queueItem')
    }
    const result = checkRateLimit('queueItem')
    expect(result.isLimited).toBe(true)
    expect(result.remainingAttempts).toBe(0)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('cleans up expired timestamps', () => {
    // Manually store timestamps that are old (beyond the 60s window)
    const oldTimestamp = Date.now() - 120_000 // 2 minutes ago
    storage.set(
      'link-party-rate-limit-queueItem',
      JSON.stringify({ timestamps: [oldTimestamp, oldTimestamp, oldTimestamp] }),
    )

    const result = checkRateLimit('queueItem')
    expect(result.isLimited).toBe(false)
    expect(result.remainingAttempts).toBe(10)
  })

  it('returns correct retryAfterMs based on oldest timestamp', () => {
    const now = Date.now()
    // Fill to exactly the limit
    const timestamps = Array.from({ length: 10 }, (_, i) => now - i * 1000)
    storage.set('link-party-rate-limit-queueItem', JSON.stringify({ timestamps }))

    const result = checkRateLimit('queueItem')
    expect(result.isLimited).toBe(true)
    // Oldest timestamp is now - 9000, so retryAfterMs should be about windowMs - 9000 = 51000
    expect(result.retryAfterMs).toBeGreaterThan(50_000)
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000)
  })
})

describe('recordAttempt', () => {
  it('records a timestamp in localStorage', () => {
    recordAttempt('partyCreation')

    const stored = storage.get('link-party-rate-limit-partyCreation')
    expect(stored).toBeDefined()

    const parsed = JSON.parse(stored!)
    expect(parsed.timestamps).toHaveLength(1)
    expect(parsed.timestamps[0]).toBeCloseTo(Date.now(), -2) // within ~100ms
  })

  it('appends to existing timestamps', () => {
    recordAttempt('imageUpload')
    recordAttempt('imageUpload')
    recordAttempt('imageUpload')

    const stored = storage.get('link-party-rate-limit-imageUpload')
    const parsed = JSON.parse(stored!)
    expect(parsed.timestamps).toHaveLength(3)
  })
})

describe('formatRetryTime', () => {
  it('returns "a moment" for less than 1 second', () => {
    expect(formatRetryTime(500)).toBe('a moment')
    expect(formatRetryTime(0)).toBe('a moment')
    expect(formatRetryTime(999)).toBe('a moment')
  })

  it('returns singular second', () => {
    expect(formatRetryTime(1000)).toBe('1 second')
  })

  it('returns plural seconds', () => {
    expect(formatRetryTime(30_000)).toBe('30 seconds')
  })

  it('returns singular minute', () => {
    expect(formatRetryTime(60_000)).toBe('1 minute')
  })

  it('returns plural minutes', () => {
    expect(formatRetryTime(120_000)).toBe('2 minutes')
  })

  it('returns singular hour', () => {
    expect(formatRetryTime(3_600_000)).toBe('1 hour')
  })

  it('returns plural hours', () => {
    expect(formatRetryTime(7_200_000)).toBe('2 hours')
  })

  it('rounds up seconds', () => {
    expect(formatRetryTime(1_500)).toBe('2 seconds')
  })

  it('rounds up minutes', () => {
    expect(formatRetryTime(61_000)).toBe('2 minutes')
  })
})

describe('getRateLimitMessage', () => {
  it('returns queue item message', () => {
    const msg = getRateLimitMessage('queueItem', 30_000)
    expect(msg).toContain('Too many items added')
    expect(msg).toContain('30 seconds')
  })

  it('returns party creation message', () => {
    const msg = getRateLimitMessage('partyCreation', 3_600_000)
    expect(msg).toContain('Too many parties created')
    expect(msg).toContain('1 hour')
  })

  it('returns image upload message', () => {
    const msg = getRateLimitMessage('imageUpload', 45_000)
    expect(msg).toContain('Too many images uploaded')
    expect(msg).toContain('45 seconds')
  })
})

describe('tryAction', () => {
  it('returns null when action is allowed', () => {
    const result = tryAction('queueItem')
    expect(result).toBeNull()
  })

  it('records the attempt when allowed', () => {
    tryAction('queueItem')
    const { remainingAttempts } = checkRateLimit('queueItem')
    expect(remainingAttempts).toBe(9)
  })

  it('returns error message when rate limited', () => {
    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      recordAttempt('queueItem')
    }
    const result = tryAction('queueItem')
    expect(result).toBeTypeOf('string')
    expect(result).toContain('Too many items added')
  })

  it('does not record attempt when rate limited', () => {
    for (let i = 0; i < 3; i++) {
      recordAttempt('partyCreation')
    }
    // Attempt should be rejected
    const result = tryAction('partyCreation')
    expect(result).not.toBeNull()

    // Should still be 3 timestamps, not 4
    const stored = storage.get('link-party-rate-limit-partyCreation')
    const parsed = JSON.parse(stored!)
    expect(parsed.timestamps).toHaveLength(3)
  })
})
