import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generatePartyCode,
  getSessionId,
  getDisplayName,
  setDisplayName,
  getAvatar,
  getCurrentParty,
  setCurrentParty,
  clearCurrentParty,
} from './supabase'

describe('supabase utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePartyCode', () => {
    it('generates a 6-character code', () => {
      const code = generatePartyCode()
      expect(code).toHaveLength(6)
    })

    it('only contains valid characters', () => {
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const code = generatePartyCode()
      for (const char of code) {
        expect(validChars).toContain(char)
      }
    })

    it('generates different codes on multiple calls', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        codes.add(generatePartyCode())
      }
      // Should have generated mostly unique codes
      expect(codes.size).toBeGreaterThan(90)
    })
  })

  describe('getSessionId', () => {
    it('returns existing session id from localStorage', () => {
      const mockSessionId = 'existing-session-id'
      vi.mocked(localStorage.getItem).mockReturnValue(mockSessionId)

      const result = getSessionId()

      expect(localStorage.getItem).toHaveBeenCalledWith('link-party-session-id')
      expect(result).toBe(mockSessionId)
    })

    it('creates new session id if none exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = getSessionId()

      expect(localStorage.setItem).toHaveBeenCalledWith('link-party-session-id', 'test-uuid-1234')
      expect(result).toBe('test-uuid-1234')
    })
  })

  describe('getDisplayName', () => {
    it('returns display name from localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('Test User')

      const result = getDisplayName()

      expect(localStorage.getItem).toHaveBeenCalledWith('link-party-display-name')
      expect(result).toBe('Test User')
    })

    it('returns empty string if no display name set', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = getDisplayName()

      expect(result).toBe('')
    })
  })

  describe('setDisplayName', () => {
    it('saves display name to localStorage', () => {
      setDisplayName('New User')

      expect(localStorage.setItem).toHaveBeenCalledWith('link-party-display-name', 'New User')
    })
  })

  describe('getAvatar', () => {
    it('returns existing avatar from localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('🎸')

      const result = getAvatar()
      expect(localStorage.getItem).toHaveBeenCalledWith('link-party-avatar')
      expect(result).toBe('🎸')
    })

    it('generates and stores a random avatar when none exists', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = getAvatar()
      expect(result).toBeTruthy()
      expect(localStorage.setItem).toHaveBeenCalledWith('link-party-avatar', result)
    })
  })

  describe('getCurrentParty', () => {
    it('returns parsed party data from localStorage', () => {
      const partyData = { partyId: 'p-1', partyCode: 'ABC123' }
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(partyData))

      const result = getCurrentParty()
      expect(localStorage.getItem).toHaveBeenCalledWith('link-party-current-party')
      expect(result).toEqual(partyData)
    })

    it('returns null when no party stored', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = getCurrentParty()
      expect(result).toBeNull()
    })
  })

  describe('setCurrentParty', () => {
    it('stores party data as JSON', () => {
      setCurrentParty('p-1', 'ABC123')

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'link-party-current-party',
        JSON.stringify({ partyId: 'p-1', partyCode: 'ABC123' }),
      )
    })
  })

  describe('clearCurrentParty', () => {
    it('removes party data from localStorage', () => {
      clearCurrentParty()

      expect(localStorage.removeItem).toHaveBeenCalledWith('link-party-current-party')
    })
  })
})
