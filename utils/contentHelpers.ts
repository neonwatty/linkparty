import type { ContentType } from '@/types'
import { YoutubeIcon, TwitterIcon, RedditIcon, NoteIcon, ImageIcon } from '@/components/icons'

// Helper to detect content type from URL
export function detectContentType(url: string): ContentType | null {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube'
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'tweet'
  if (lowerUrl.includes('reddit.com')) return 'reddit'
  return null
}

// Helper to get content type badge info
export function getContentTypeBadge(type: ContentType) {
  switch (type) {
    case 'youtube':
      return { icon: YoutubeIcon, color: 'text-red-500', bg: 'bg-red-500/20' }
    case 'tweet':
      return { icon: TwitterIcon, color: 'text-blue-400', bg: 'bg-blue-400/20' }
    case 'reddit':
      return { icon: RedditIcon, color: 'text-orange-500', bg: 'bg-orange-500/20' }
    case 'note':
      return { icon: NoteIcon, color: 'text-gray-400', bg: 'bg-gray-400/20' }
    case 'image':
      return { icon: ImageIcon, color: 'text-purple-400', bg: 'bg-purple-400/20' }
  }
}
