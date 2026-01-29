import { logger } from './logger'

const log = logger.createLogger('Retry')

interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry,
  } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt > maxRetries) {
        log.error(`All ${maxRetries} retries exhausted`, lastError)
        throw lastError
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1)
      const jitter = Math.random() * 0.3 * exponentialDelay
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

      log.debug(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms`)
      onRetry?.(attempt, lastError)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // TypeScript needs this but it's unreachable
  throw lastError
}

/**
 * Create a retryable version of a function
 */
export function createRetryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options)
  }) as T
}
