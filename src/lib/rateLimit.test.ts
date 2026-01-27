import { describe, it, expect } from 'vitest'
import { formatRetryTime, getRateLimitMessage } from './rateLimit'

describe('rateLimit', () => {
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
})
