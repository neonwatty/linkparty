import { describe, it, expect } from 'vitest'
import { detectContentType, getContentTypeBadge } from './contentHelpers'

describe('utils/contentHelpers', () => {
  describe('detectContentType', () => {
    it('detects YouTube URLs', () => {
      expect(detectContentType('https://www.youtube.com/watch?v=abc')).toBe('youtube')
      expect(detectContentType('https://youtu.be/abc')).toBe('youtube')
    })

    it('detects Twitter/X URLs', () => {
      expect(detectContentType('https://twitter.com/user/status/1')).toBe('tweet')
      expect(detectContentType('https://x.com/user/status/1')).toBe('tweet')
    })

    it('detects Reddit URLs', () => {
      expect(detectContentType('https://www.reddit.com/r/test')).toBe('reddit')
    })

    it('returns null for unknown URLs', () => {
      expect(detectContentType('https://example.com')).toBeNull()
    })
  })

  describe('getContentTypeBadge', () => {
    it('returns badge for youtube', () => {
      const badge = getContentTypeBadge('youtube')
      expect(badge.color).toBe('text-red-500')
      expect(badge.icon).toBeDefined()
    })

    it('returns badge for tweet', () => {
      const badge = getContentTypeBadge('tweet')
      expect(badge.color).toBe('text-blue-400')
    })

    it('returns badge for reddit', () => {
      const badge = getContentTypeBadge('reddit')
      expect(badge.color).toBe('text-orange-500')
    })

    it('returns badge for note', () => {
      const badge = getContentTypeBadge('note')
      expect(badge.color).toBe('text-gray-400')
    })

    it('returns badge for image', () => {
      const badge = getContentTypeBadge('image')
      expect(badge.color).toBe('text-purple-400')
    })
  })
})
