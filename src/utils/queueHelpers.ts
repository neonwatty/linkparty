import type { QueueItem } from '../hooks/useParty'
import { formatDueDate } from './dateHelpers'

// Helper to get display title for queue item
export function getQueueItemTitle(item: QueueItem): string {
  switch (item.type) {
    case 'youtube':
      return item.title || 'Untitled Video'
    case 'tweet':
      if (!item.tweetContent) return 'Tweet'
      return item.tweetContent.slice(0, 60) + (item.tweetContent.length > 60 ? '...' : '')
    case 'reddit':
      return item.redditTitle || 'Reddit Post'
    case 'note':
      if (!item.noteContent) return 'Note'
      return item.noteContent.slice(0, 60) + (item.noteContent.length > 60 ? '...' : '')
    case 'image':
      return item.imageCaption || item.imageName || 'Image'
  }
}

// Helper to get subtitle for queue item
export function getQueueItemSubtitle(item: QueueItem): string {
  const baseSubtitle = (() => {
    switch (item.type) {
      case 'youtube':
        return `${item.duration || ''} · Added by ${item.addedBy}`
      case 'tweet':
        return `${item.tweetAuthor} · Added by ${item.addedBy}`
      case 'reddit':
        return `${item.subreddit} · Added by ${item.addedBy}`
      case 'note':
        if (item.isCompleted) {
          return `Completed · Added by ${item.addedBy}`
        }
        if (item.dueDate) {
          return `${formatDueDate(item.dueDate)} · Added by ${item.addedBy}`
        }
        return `Added by ${item.addedBy}`
      case 'image':
        return `Added by ${item.addedBy}`
    }
  })()
  return baseSubtitle
}
