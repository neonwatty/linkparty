import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter } from './serverRateLimit'

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns limited: false when under limit', () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 })
    const result = limiter.check('user-1')
    expect(result).toEqual({ limited: false, retryAfterMs: 0 })
  })

  it('returns limited: true when limit exceeded', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 })

    // First 3 calls should be allowed (count 1, 2, 3 — limit triggers at count > maxRequests)
    for (let i = 0; i < 3; i++) {
      expect(limiter.check('user-1').limited).toBe(false)
    }

    // 4th call: count becomes 4, which is > 3
    const result = limiter.check('user-1')
    expect(result.limited).toBe(true)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('resets after window expires', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 10_000 })

    // Exhaust the limit
    limiter.check('user-1')
    limiter.check('user-1')
    expect(limiter.check('user-1').limited).toBe(true)

    // Advance past the window
    vi.advanceTimersByTime(10_001)

    // Should be allowed again
    const result = limiter.check('user-1')
    expect(result).toEqual({ limited: false, retryAfterMs: 0 })
  })

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 })

    // First call for each key is allowed
    expect(limiter.check('user-a').limited).toBe(false)
    expect(limiter.check('user-b').limited).toBe(false)

    // Second call for user-a exceeds limit
    expect(limiter.check('user-a').limited).toBe(true)

    // user-b still has one more allowed call (count goes to 2, which is > 1 → limited)
    expect(limiter.check('user-b').limited).toBe(true)

    // A new key is still fine
    expect(limiter.check('user-c').limited).toBe(false)
  })

  it('cleanup runs every 100 checks and removes expired entries', () => {
    const limiter = createRateLimiter({ maxRequests: 1000, windowMs: 5_000 })

    // Create some entries
    limiter.check('expired-1')
    limiter.check('expired-2')
    expect(limiter._store!.size).toBe(2)

    // Advance past the window so entries expire
    vi.advanceTimersByTime(5_001)

    // Add a fresh entry that won't be expired
    limiter.check('fresh-1')
    expect(limiter._store!.size).toBe(3)

    // We've made 3 checks so far. Need 97 more to reach 100 total (triggers cleanup).
    for (let i = 0; i < 97; i++) {
      limiter.check('fresh-1')
    }

    // 100th check triggers cleanup — expired entries removed
    expect(limiter._store!.size).toBe(1)
    expect(limiter._store!.has('fresh-1')).toBe(true)
    expect(limiter._store!.has('expired-1')).toBe(false)
    expect(limiter._store!.has('expired-2')).toBe(false)
  })

  it('retryAfterMs is positive and at most windowMs', () => {
    const windowMs = 30_000
    const limiter = createRateLimiter({ maxRequests: 1, windowMs })

    limiter.check('user-1')
    const result = limiter.check('user-1')

    expect(result.limited).toBe(true)
    expect(result.retryAfterMs).toBeGreaterThan(0)
    expect(result.retryAfterMs).toBeLessThanOrEqual(windowMs)
  })
})
