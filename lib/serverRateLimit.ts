// lib/serverRateLimit.ts
// Shared server-side rate limiter using in-memory Map
// TODO: Replace with Upstash Redis for production multi-instance deployments

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Each limiter instance has its own Map
export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>()
  let checkCount = 0

  function cleanup() {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }

  return {
    check(key: string): { limited: boolean; retryAfterMs: number } {
      checkCount++
      if (checkCount % 100 === 0) cleanup()

      const now = Date.now()
      const entry = store.get(key)

      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + config.windowMs })
        return { limited: false, retryAfterMs: 0 }
      }

      entry.count++
      if (entry.count > config.maxRequests) {
        return { limited: true, retryAfterMs: entry.resetAt - now }
      }

      return { limited: false, retryAfterMs: 0 }
    },

    /** Exposed for testing */
    _store: store,
  }
}
