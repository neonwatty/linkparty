import { describe, it, expect } from 'vitest'
import {
  detectContentType,
  extractYouTubeVideoId,
  parseYouTubeDuration,
  extractTwitterHandle,
  stripHtml,
  normalizeRedditUrl,
} from './contentMetadataHelpers'

describe('detectContentType', () => {
  it('returns youtube for youtube.com URLs', () => {
    expect(detectContentType('https://www.youtube.com/watch?v=abc123')).toBe('youtube')
  })

  it('returns youtube for youtu.be URLs', () => {
    expect(detectContentType('https://youtu.be/abc123')).toBe('youtube')
  })

  it('returns tweet for twitter.com URLs', () => {
    expect(detectContentType('https://twitter.com/user/status/123')).toBe('tweet')
  })

  it('returns tweet for x.com URLs', () => {
    expect(detectContentType('https://x.com/user/status/123')).toBe('tweet')
  })

  it('returns reddit for reddit.com URLs', () => {
    expect(detectContentType('https://www.reddit.com/r/test/comments/abc')).toBe('reddit')
  })

  it('returns null for unsupported URLs', () => {
    expect(detectContentType('https://example.com/page')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(detectContentType('https://WWW.YOUTUBE.COM/watch?v=abc')).toBe('youtube')
    expect(detectContentType('https://TWITTER.COM/user/status/1')).toBe('tweet')
    expect(detectContentType('https://OLD.REDDIT.COM/r/test')).toBe('reddit')
  })
})

describe('extractYouTubeVideoId', () => {
  it('extracts ID from youtu.be short URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from youtube.com/watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from youtube.com/embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from youtube.com/v URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from youtube.com/shorts URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID when URL has additional query params', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123&t=10s')).toBe('abc123')
  })

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://example.com/watch?v=abc123')).toBeNull()
  })

  it('returns null for invalid YouTube URLs without video ID', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/channel/UCxyz')).toBeNull()
  })
})

describe('parseYouTubeDuration', () => {
  it('parses hours, minutes, and seconds', () => {
    expect(parseYouTubeDuration('PT1H2M3S')).toBe('1:02:03')
  })

  it('parses minutes and seconds only', () => {
    expect(parseYouTubeDuration('PT5M30S')).toBe('5:30')
  })

  it('parses seconds only', () => {
    expect(parseYouTubeDuration('PT45S')).toBe('0:45')
  })

  it('parses hours and minutes without seconds', () => {
    expect(parseYouTubeDuration('PT1H30M')).toBe('1:30:00')
  })

  it('parses hours only', () => {
    expect(parseYouTubeDuration('PT2H')).toBe('2:00:00')
  })

  it('parses minutes only', () => {
    expect(parseYouTubeDuration('PT10M')).toBe('10:00')
  })

  it('returns empty string for empty input', () => {
    expect(parseYouTubeDuration('')).toBe('')
  })

  it('returns empty string for invalid format', () => {
    expect(parseYouTubeDuration('not-a-duration')).toBe('')
  })
})

describe('extractTwitterHandle', () => {
  it('extracts handle from twitter.com URL', () => {
    expect(extractTwitterHandle('https://twitter.com/elonmusk/status/123456')).toBe('elonmusk')
  })

  it('extracts handle from x.com URL', () => {
    expect(extractTwitterHandle('https://x.com/OpenAI/status/789012')).toBe('OpenAI')
  })

  it('returns null for non-tweet URLs', () => {
    expect(extractTwitterHandle('https://twitter.com/elonmusk')).toBeNull()
  })

  it('returns null for URLs without /status/ path segment', () => {
    expect(extractTwitterHandle('https://example.com/some/path')).toBeNull()
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<b>bold</b> and <i>italic</i>')).toBe('bold and italic')
  })

  it('decodes &amp; entity', () => {
    expect(stripHtml('rock &amp; roll')).toBe('rock & roll')
  })

  it('decodes &lt; and &gt; entities', () => {
    expect(stripHtml('1 &lt; 2 &gt; 0')).toBe('1 < 2 > 0')
  })

  it('decodes &quot; entity', () => {
    expect(stripHtml('she said &quot;hello&quot;')).toBe('she said "hello"')
  })

  it('decodes &#39; entity', () => {
    expect(stripHtml('it&#39;s fine')).toBe("it's fine")
  })

  it('collapses multiple spaces into one', () => {
    expect(stripHtml('hello   world')).toBe('hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(stripHtml('  hello  ')).toBe('hello')
  })

  it('handles complex HTML', () => {
    expect(stripHtml('<p>Hello</p><br/><p>World &amp; Friends</p>')).toBe('Hello World & Friends')
  })
})

describe('normalizeRedditUrl', () => {
  it('strips query parameters', () => {
    expect(normalizeRedditUrl('https://www.reddit.com/r/test/comments/abc?utm_source=share')).toBe(
      'https://www.reddit.com/r/test/comments/abc',
    )
  })

  it('strips trailing slash', () => {
    expect(normalizeRedditUrl('https://www.reddit.com/r/test/comments/abc/')).toBe(
      'https://www.reddit.com/r/test/comments/abc',
    )
  })

  it('normalizes old.reddit.com to www.reddit.com', () => {
    expect(normalizeRedditUrl('https://old.reddit.com/r/test/comments/abc')).toBe(
      'https://www.reddit.com/r/test/comments/abc',
    )
  })

  it('normalizes bare reddit.com to www.reddit.com', () => {
    expect(normalizeRedditUrl('https://reddit.com/r/test/comments/abc')).toBe(
      'https://www.reddit.com/r/test/comments/abc',
    )
  })

  it('keeps www.reddit.com unchanged', () => {
    expect(normalizeRedditUrl('https://www.reddit.com/r/test/comments/abc')).toBe(
      'https://www.reddit.com/r/test/comments/abc',
    )
  })

  it('handles URL with both trailing slash and query params', () => {
    expect(normalizeRedditUrl('https://old.reddit.com/r/test/comments/abc/?ref=share')).toBe(
      'https://www.reddit.com/r/test/comments/abc',
    )
  })
})
