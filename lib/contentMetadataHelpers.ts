// Pure helper functions for content metadata processing
// Extracted from supabase/functions/fetch-content-metadata/index.ts for testability

/** Detect content type from URL */
export function detectContentType(url: string): 'youtube' | 'tweet' | 'reddit' | null {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube'
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'tweet'
  if (lowerUrl.includes('reddit.com')) return 'reddit'
  return null
}

/** Extract YouTube video ID from various URL formats */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/v\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** Parse YouTube ISO 8601 duration (e.g. PT1H2M3S) to human readable format (e.g. 1:02:03) */
export function parseYouTubeDuration(isoDuration: string): string {
  if (!isoDuration) return ''
  // eslint-disable-next-line security/detect-unsafe-regex
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const [, hours, minutes, seconds] = match
  if (hours) {
    return `${hours}:${(minutes || '0').padStart(2, '0')}:${(seconds || '0').padStart(2, '0')}`
  }
  return `${minutes || '0'}:${(seconds || '0').padStart(2, '0')}`
}

/** Extract Twitter handle from a tweet URL */
export function extractTwitterHandle(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status/)
  return match ? match[1] : null
}

/** Strip HTML tags and decode common HTML entities */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize a Reddit URL: strip query params, trailing slash, and normalize subdomain */
export function normalizeRedditUrl(url: string): string {
  let cleanUrl = url.split('?')[0].replace(/\/$/, '')
  cleanUrl = cleanUrl.replace(/^https?:\/\/(old\.|www\.)?reddit\.com/, 'https://www.reddit.com')
  return cleanUrl
}
