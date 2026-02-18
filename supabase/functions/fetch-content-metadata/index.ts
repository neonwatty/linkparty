// Supabase Edge Function: fetch-content-metadata
// Fetches metadata for YouTube, Twitter/X, and Reddit URLs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface MetadataResult {
  success: boolean
  type?: 'youtube' | 'tweet' | 'reddit'
  data?: {
    // YouTube
    title?: string
    channel?: string
    duration?: string
    thumbnail?: string
    // Twitter
    tweetAuthor?: string
    tweetHandle?: string
    tweetContent?: string
    tweetTimestamp?: string
    // Reddit
    subreddit?: string
    redditTitle?: string
    redditBody?: string
    upvotes?: number
    commentCount?: number
  }
  error?: string
}

// Detect content type from URL
function detectContentType(url: string): 'youtube' | 'tweet' | 'reddit' | null {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube'
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'tweet'
  if (lowerUrl.includes('reddit.com')) return 'reddit'
  return null
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url: string): string | null {
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

// Parse YouTube ISO 8601 duration to human readable format
function parseYouTubeDuration(isoDuration: string): string {
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

// Fetch YouTube metadata using oEmbed API
async function fetchYouTubeMetadata(url: string): Promise<MetadataResult> {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) {
    return { success: false, error: 'Invalid YouTube URL' }
  }

  try {
    // Use oEmbed API (no API key required)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
    const response = await fetch(oembedUrl)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Video is private or unavailable' }
      }
      return { success: false, error: 'Video not found' }
    }

    const data = await response.json()

    // Try to get duration from YouTube Data API if key is available
    let duration: string | undefined
    const apiKey = Deno.env.get('YOUTUBE_API_KEY')
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
        const apiResponse = await fetch(apiUrl)
        if (apiResponse.ok) {
          const apiData = await apiResponse.json()
          const isoDuration = apiData.items?.[0]?.contentDetails?.duration
          if (isoDuration) {
            duration = parseYouTubeDuration(isoDuration)
          }
        }
      } catch {
        // Ignore API errors, duration is optional
      }
    }

    return {
      success: true,
      type: 'youtube',
      data: {
        title: data.title,
        channel: data.author_name,
        thumbnail: data.thumbnail_url,
        duration,
      },
    }
  } catch (err) {
    return { success: false, error: `Failed to fetch YouTube data: ${err}` }
  }
}

// Extract Twitter handle from URL
function extractTwitterHandle(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status/)
  return match ? match[1] : null
}

// Strip HTML tags from string
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Fetch Twitter/X metadata using oEmbed API
async function fetchTweetMetadata(url: string): Promise<MetadataResult> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
    const response = await fetch(oembedUrl)

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Tweet not found or deleted' }
      }
      if (response.status === 403) {
        return { success: false, error: 'Tweet is from a protected account' }
      }
      return { success: false, error: 'Failed to fetch tweet' }
    }

    const data = await response.json()
    const handle = extractTwitterHandle(url)
    const tweetContent = stripHtml(data.html)

    return {
      success: true,
      type: 'tweet',
      data: {
        tweetAuthor: data.author_name,
        tweetHandle: handle ? `@${handle}` : undefined,
        tweetContent: tweetContent.slice(0, 500), // Truncate long content
      },
    }
  } catch (err) {
    return { success: false, error: `Failed to fetch tweet: ${err}` }
  }
}

// Normalize Reddit URL
function normalizeRedditUrl(url: string): string {
  let cleanUrl = url.split('?')[0].replace(/\/$/, '')
  cleanUrl = cleanUrl.replace(/^https?:\/\/(old\.|www\.)?reddit\.com/, 'https://www.reddit.com')
  return cleanUrl
}

// Fetch Reddit metadata using JSON API
async function fetchRedditMetadata(url: string): Promise<MetadataResult> {
  try {
    const cleanUrl = normalizeRedditUrl(url)
    const jsonUrl = `${cleanUrl}.json`

    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'LinkParty/1.0 (content preview)',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Reddit post not found' }
      }
      if (response.status === 403) {
        return { success: false, error: 'Reddit post is private or quarantined' }
      }
      return { success: false, error: 'Failed to fetch Reddit post' }
    }

    const data = await response.json()
    const post = data[0]?.data?.children?.[0]?.data

    if (!post) {
      return { success: false, error: 'Could not parse Reddit response' }
    }

    return {
      success: true,
      type: 'reddit',
      data: {
        subreddit: `r/${post.subreddit}`,
        redditTitle: post.title,
        redditBody: post.selftext?.slice(0, 500) || undefined,
        upvotes: post.ups,
        commentCount: post.num_comments,
      },
    }
  } catch (err) {
    return { success: false, error: `Failed to fetch Reddit post: ${err}` }
  }
}

// Allowed CORS origins
const CORS_ORIGINS = ['https://linkparty.app', 'http://localhost:3000', 'http://localhost:5173']

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || ''
  return CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0]
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(req),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// Verify Authorization header contains a valid project key.
// The client passes the anon key; server routes pass the service role key.
// Both are automatically available as env vars in Supabase edge functions.
function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.replace('Bearer ', '')
  if (!token) return false

  // Accept the project's anon key (used by the browser client)
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (anonKey && token === anonKey) return true

  // Accept the service role key (used by server-side API routes)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceKey && token === serviceKey) return true

  // Reject unknown tokens
  return false
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    })
  }

  // Verify JWT authentication
  const isAuthenticated = await verifyAuth(req)
  if (!isAuthenticated) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    })
  }

  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': getCorsOrigin(req),
        },
      })
    }

    // SSRF protection: validate URL scheme and hostname before any fetching
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid URL format' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': getCorsOrigin(req),
        },
      })
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return new Response(JSON.stringify({ success: false, error: 'URL domain not supported' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': getCorsOrigin(req),
        },
      })
    }

    const ALLOWED_HOSTS = ['youtube.com', 'youtu.be', 'twitter.com', 'x.com', 'reddit.com']
    const hostname = parsed.hostname.toLowerCase()
    const isAllowed = ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith('.' + h))

    if (!isAllowed) {
      return new Response(JSON.stringify({ success: false, error: 'URL domain not supported' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': getCorsOrigin(req),
        },
      })
    }

    const contentType = detectContentType(url)

    if (!contentType) {
      return new Response(JSON.stringify({ success: false, error: 'Unsupported URL type' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': getCorsOrigin(req),
        },
      })
    }

    let result: MetadataResult

    switch (contentType) {
      case 'youtube':
        result = await fetchYouTubeMetadata(url)
        break
      case 'tweet':
        result = await fetchTweetMetadata(url)
        break
      case 'reddit':
        result = await fetchRedditMetadata(url)
        break
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: `Server error: ${err}` }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})
