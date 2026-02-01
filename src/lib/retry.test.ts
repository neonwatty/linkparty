import { describe, it, expect, vi } from 'vitest'
import { withRetry, createRetryable } from './retry'

describe('withRetry', () => {
  it('returns result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success')

    const result = await withRetry(fn, { baseDelayMs: 10, maxDelayMs: 20 })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries up to maxRetries times before failing', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 20 })
    ).rejects.toThrow('always fails')

    // 1 initial + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('uses default maxRetries of 3', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    await expect(
      withRetry(fn, { baseDelayMs: 10, maxDelayMs: 20 })
    ).rejects.toThrow('fail')

    // 1 initial + 3 retries = 4 total
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('calls onRetry callback on each retry', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success')

    const onRetry = vi.fn()

    await withRetry(fn, { baseDelayMs: 10, maxDelayMs: 20, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error))
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error))
  })

  it('converts non-Error throws to Error objects', async () => {
    const fn = vi.fn().mockRejectedValue('string error')
    const onRetry = vi.fn()

    await expect(
      withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 10,
        maxDelayMs: 20,
        onRetry,
      })
    ).rejects.toThrow('string error')

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })

  it('respects maxDelayMs cap', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success')

    const startTime = Date.now()

    // With baseDelayMs=10000 and maxDelayMs=50, delay should be capped at 50ms
    const result = await withRetry(fn, {
      baseDelayMs: 10000,
      maxDelayMs: 50,
    })

    const elapsed = Date.now() - startTime

    expect(result).toBe('success')
    // Should complete in under 200ms (with jitter), not 10+ seconds
    expect(elapsed).toBeLessThan(200)
  })
})

describe('createRetryable', () => {
  it('creates a retryable version of a function', async () => {
    const originalFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success')

    const retryableFn = createRetryable(originalFn, {
      baseDelayMs: 10,
      maxDelayMs: 20,
    })

    const result = await retryableFn()

    expect(result).toBe('success')
    expect(originalFn).toHaveBeenCalledTimes(2)
  })

  it('passes arguments to the original function', async () => {
    const originalFn = vi.fn().mockResolvedValue('result')

    const retryableFn = createRetryable(originalFn)

    await retryableFn('arg1', 'arg2')

    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})
