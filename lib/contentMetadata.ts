// Content metadata fetching service
// Calls Supabase Edge Function or returns mock data in development

import { logger } from './logger'

const log = logger.createLogger('ContentMetadata')

export interface ContentMetadataResponse {
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

// Mock data for development when Supabase is not configured
function getMockMetadata(url: string): ContentMetadataResponse {
  const lowerUrl = url.toLowerCase()

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return {
      success: true,
      type: 'youtube',
      data: {
        title: 'Sample YouTube Video',
        channel: 'Sample Channel',
        duration: '10:30',
        thumbnail: 'https://picsum.photos/seed/youtube/320/180',
      },
    }
  }

  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return {
      success: true,
      type: 'tweet',
      data: {
        tweetAuthor: 'Sample User',
        tweetHandle: '@sampleuser',
        tweetContent: 'This is a sample tweet for development mode.',
      },
    }
  }

  if (lowerUrl.includes('reddit.com')) {
    return {
      success: true,
      type: 'reddit',
      data: {
        subreddit: 'r/sample',
        redditTitle: 'Sample Reddit Post',
        redditBody: 'This is sample content for development mode.',
        upvotes: 1234,
        commentCount: 56,
      },
    }
  }

  return {
    success: false,
    error: 'Unsupported URL type',
  }
}

export async function fetchContentMetadata(url: string): Promise<ContentMetadataResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return mock data if Supabase is not configured
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return getMockMetadata(url)
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-content-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return await response.json()
  } catch (err) {
    log.error('Content metadata fetch failed', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
