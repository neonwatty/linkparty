import { describe, it, expect } from 'vitest'
import { getUserFriendlyMessage } from './errorMessages'

describe('getUserFriendlyMessage', () => {
  describe('network errors', () => {
    it('handles "Failed to fetch" errors', () => {
      const err = new Error('Failed to fetch')
      expect(getUserFriendlyMessage(err)).toBe(
        'Connection failed. Check your internet and try again.'
      )
    })

    it('handles "NetworkError" errors', () => {
      const err = new Error('NetworkError when attempting to fetch resource')
      expect(getUserFriendlyMessage(err)).toBe(
        'Connection failed. Check your internet and try again.'
      )
    })
  })

  describe('rate limiting errors', () => {
    it('handles "rate limit" errors', () => {
      const err = new Error('rate limit exceeded')
      expect(getUserFriendlyMessage(err)).toBe(
        'Too many requests. Please wait a moment.'
      )
    })

    it('handles "too many" errors', () => {
      const err = new Error('too many requests')
      expect(getUserFriendlyMessage(err)).toBe(
        'Too many requests. Please wait a moment.'
      )
    })
  })

  describe('authentication errors', () => {
    it('handles "not authenticated" errors', () => {
      const err = new Error('User is not authenticated')
      expect(getUserFriendlyMessage(err)).toBe('Please sign in to continue.')
    })

    it('handles "unauthorized" errors', () => {
      const err = new Error('unauthorized access')
      expect(getUserFriendlyMessage(err)).toBe('Please sign in to continue.')
    })
  })

  describe('permission errors', () => {
    it('handles "permission" errors', () => {
      const err = new Error('permission denied')
      expect(getUserFriendlyMessage(err)).toBe(
        "You don't have permission for this action."
      )
    })

    it('handles "forbidden" errors', () => {
      const err = new Error('forbidden resource')
      expect(getUserFriendlyMessage(err)).toBe(
        "You don't have permission for this action."
      )
    })
  })

  describe('not found errors', () => {
    it('handles "not found" errors', () => {
      const err = new Error('Resource not found')
      expect(getUserFriendlyMessage(err)).toBe(
        'The requested item was not found.'
      )
    })
  })

  describe('timeout errors', () => {
    it('handles "timeout" errors', () => {
      const err = new Error('Request timeout')
      expect(getUserFriendlyMessage(err)).toBe(
        'Request timed out. Please try again.'
      )
    })
  })

  describe('short user-friendly messages', () => {
    it('returns short messages as-is', () => {
      const err = new Error('Invalid party code')
      expect(getUserFriendlyMessage(err)).toBe('Invalid party code')
    })

    it('returns generic message for long error messages', () => {
      const longMessage = 'a'.repeat(101)
      const err = new Error(longMessage)
      expect(getUserFriendlyMessage(err)).toBe(
        'Something went wrong. Please try again.'
      )
    })

    it('returns generic message for messages containing "Error:"', () => {
      const err = new Error('Error: some technical details here')
      expect(getUserFriendlyMessage(err)).toBe(
        'Something went wrong. Please try again.'
      )
    })
  })

  describe('non-Error inputs', () => {
    it('handles null', () => {
      expect(getUserFriendlyMessage(null)).toBe(
        'Something went wrong. Please try again.'
      )
    })

    it('handles undefined', () => {
      expect(getUserFriendlyMessage(undefined)).toBe(
        'Something went wrong. Please try again.'
      )
    })

    it('handles string', () => {
      expect(getUserFriendlyMessage('some error')).toBe(
        'Something went wrong. Please try again.'
      )
    })

    it('handles object', () => {
      expect(getUserFriendlyMessage({ message: 'error' })).toBe(
        'Something went wrong. Please try again.'
      )
    })
  })
})
