import { describe, it, expect } from 'vitest'
import { LIMITS, FRIENDS, getUserFriendlyMessage } from './errorMessages'

describe('errorMessages (lib)', () => {
  describe('LIMITS constants', () => {
    it('defines all expected limit messages', () => {
      expect(LIMITS.MAX_PARTIES).toContain('5 active parties')
      expect(LIMITS.MAX_MEMBERS).toContain('max 20 members')
      expect(LIMITS.MAX_IMAGES).toContain('max 20 images')
      expect(LIMITS.PARTY_EXPIRED).toContain('expired')
      expect(LIMITS.INCORRECT_PASSWORD).toContain('Incorrect')
      expect(LIMITS.PARTY_NOT_FOUND).toContain('not found')
    })
  })

  describe('FRIENDS constants', () => {
    it('defines all expected friend error messages', () => {
      expect(FRIENDS.ALREADY_FRIENDS).toContain('already friends')
      expect(FRIENDS.REQUEST_EXISTS).toContain('already been sent')
      expect(FRIENDS.REQUEST_INCOMING).toContain('already sent you')
      expect(FRIENDS.REQUEST_NOT_FOUND).toContain('not found')
      expect(FRIENDS.CANNOT_FRIEND_SELF).toContain('yourself')
      expect(FRIENDS.NOT_AUTHORIZED).toContain('not authorized')
      expect(FRIENDS.USER_NOT_FOUND).toContain('not found')
      expect(FRIENDS.INVALID_ACTION).toContain('Invalid action')
      expect(FRIENDS.RATE_LIMITED).toContain('Too many')
      expect(FRIENDS.BLOCKED).toContain('cannot interact')
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('handles network errors', () => {
      expect(getUserFriendlyMessage(new Error('Failed to fetch'))).toBe(
        'Connection failed. Check your internet and try again.',
      )
      expect(getUserFriendlyMessage(new Error('NetworkError occurred'))).toBe(
        'Connection failed. Check your internet and try again.',
      )
    })

    it('handles rate limit errors', () => {
      expect(getUserFriendlyMessage(new Error('rate limit exceeded'))).toBe('Too many requests. Please wait a moment.')
      expect(getUserFriendlyMessage(new Error('too many requests'))).toBe('Too many requests. Please wait a moment.')
    })

    it('handles auth errors', () => {
      expect(getUserFriendlyMessage(new Error('not authenticated'))).toBe('Please sign in to continue.')
      expect(getUserFriendlyMessage(new Error('unauthorized'))).toBe('Please sign in to continue.')
    })

    it('handles permission errors', () => {
      expect(getUserFriendlyMessage(new Error('permission denied'))).toBe("You don't have permission for this action.")
      expect(getUserFriendlyMessage(new Error('forbidden'))).toBe("You don't have permission for this action.")
    })

    it('handles not found errors', () => {
      expect(getUserFriendlyMessage(new Error('not found'))).toBe('The requested item was not found.')
    })

    it('handles timeout errors', () => {
      expect(getUserFriendlyMessage(new Error('timeout'))).toBe('Request timed out. Please try again.')
    })

    it('returns short user-friendly messages as-is', () => {
      expect(getUserFriendlyMessage(new Error('Invalid party code'))).toBe('Invalid party code')
    })

    it('returns generic fallback for long or technical messages', () => {
      expect(getUserFriendlyMessage(new Error('a'.repeat(101)))).toBe('Something went wrong. Please try again.')
      expect(getUserFriendlyMessage(new Error('Error: technical details'))).toBe(
        'Something went wrong. Please try again.',
      )
    })

    it('returns generic fallback for non-Error inputs', () => {
      expect(getUserFriendlyMessage(null)).toBe('Something went wrong. Please try again.')
      expect(getUserFriendlyMessage(undefined)).toBe('Something went wrong. Please try again.')
      expect(getUserFriendlyMessage('string error')).toBe('Something went wrong. Please try again.')
      expect(getUserFriendlyMessage({ message: 'obj' })).toBe('Something went wrong. Please try again.')
    })
  })
})
