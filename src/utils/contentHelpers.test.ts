import { describe, it, expect } from 'vitest'
import { detectContentType, getContentTypeBadge } from './contentHelpers'

describe('contentHelpers', () => {
  describe('detectContentType', () => {
    it('detects YouTube URLs', () => {
      expect(detectContentType('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube')
      expect(detectContentType('https://youtube.com/watch?v=abc123')).toBe('youtube')
      expect(detectContentType('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
      expect(detectContentType('https://www.youtube.com/shorts/abc123')).toBe('youtube')
    })

    it('detects Twitter/X URLs', () => {
      expect(detectContentType('https://twitter.com/user/status/123456')).toBe('tweet')
      expect(detectContentType('https://x.com/user/status/123456')).toBe('tweet')
      expect(detectContentType('https://www.twitter.com/user/status/789')).toBe('tweet')
    })

    it('detects Reddit URLs', () => {
      expect(detectContentType('https://www.reddit.com/r/programming/comments/abc')).toBe('reddit')
      expect(detectContentType('https://reddit.com/r/AskReddit/comments/xyz')).toBe('reddit')
      expect(detectContentType('https://old.reddit.com/r/news/comments/def')).toBe('reddit')
    })

    it('is case insensitive', () => {
      expect(detectContentType('https://YOUTUBE.com/watch?v=abc')).toBe('youtube')
      expect(detectContentType('https://TWITTER.COM/user/status/123')).toBe('tweet')
      expect(detectContentType('https://REDDIT.COM/r/test')).toBe('reddit')
    })

    it('returns null for unsupported URLs', () => {
      expect(detectContentType('https://example.com')).toBe(null)
      expect(detectContentType('https://facebook.com/post/123')).toBe(null)
      expect(detectContentType('https://instagram.com/p/abc')).toBe(null)
      expect(detectContentType('not a url')).toBe(null)
    })
  })

  describe('getContentTypeBadge', () => {
    it('returns correct badge info for YouTube', () => {
      const badge = getContentTypeBadge('youtube')
      expect(badge.color).toBe('text-red-500')
      expect(badge.bg).toBe('bg-red-500/20')
      expect(badge.icon).toBeDefined()
    })

    it('returns correct badge info for tweet', () => {
      const badge = getContentTypeBadge('tweet')
      expect(badge.color).toBe('text-blue-400')
      expect(badge.bg).toBe('bg-blue-400/20')
      expect(badge.icon).toBeDefined()
    })

    it('returns correct badge info for Reddit', () => {
      const badge = getContentTypeBadge('reddit')
      expect(badge.color).toBe('text-orange-500')
      expect(badge.bg).toBe('bg-orange-500/20')
      expect(badge.icon).toBeDefined()
    })

    it('returns correct badge info for note', () => {
      const badge = getContentTypeBadge('note')
      expect(badge.color).toBe('text-gray-400')
      expect(badge.bg).toBe('bg-gray-400/20')
      expect(badge.icon).toBeDefined()
    })

    it('returns correct badge info for image', () => {
      const badge = getContentTypeBadge('image')
      expect(badge.color).toBe('text-purple-400')
      expect(badge.bg).toBe('bg-purple-400/20')
      expect(badge.icon).toBeDefined()
    })
  })
})
