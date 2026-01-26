import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getQueueItemTitle, getQueueItemSubtitle } from './queueHelpers'
import type { QueueItem } from '../hooks/useParty'

// Helper to create a mock queue item
function createMockItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'test-id',
    type: 'note',
    addedBy: 'TestUser',
    addedBySessionId: 'session-123',
    status: 'pending',
    position: 0,
    isCompleted: false,
    ...overrides,
  }
}

describe('queueHelpers', () => {
  describe('getQueueItemTitle', () => {
    it('returns video title for YouTube items', () => {
      const item = createMockItem({
        type: 'youtube',
        title: 'My Awesome Video',
      })
      expect(getQueueItemTitle(item)).toBe('My Awesome Video')
    })

    it('returns "Untitled Video" for YouTube items without title', () => {
      const item = createMockItem({
        type: 'youtube',
        title: undefined,
      })
      expect(getQueueItemTitle(item)).toBe('Untitled Video')
    })

    it('returns truncated tweet content for tweet items', () => {
      const item = createMockItem({
        type: 'tweet',
        tweetContent: 'This is a short tweet',
      })
      expect(getQueueItemTitle(item)).toBe('This is a short tweet')
    })

    it('truncates long tweet content with ellipsis', () => {
      const longContent = 'A'.repeat(100)
      const item = createMockItem({
        type: 'tweet',
        tweetContent: longContent,
      })
      const result = getQueueItemTitle(item)
      expect(result).toHaveLength(63) // 60 chars + '...'
      expect(result.endsWith('...')).toBe(true)
    })

    it('returns "Tweet" for tweet items without content', () => {
      const item = createMockItem({
        type: 'tweet',
        tweetContent: undefined,
      })
      expect(getQueueItemTitle(item)).toBe('Tweet')
    })

    it('returns reddit title for Reddit items', () => {
      const item = createMockItem({
        type: 'reddit',
        redditTitle: 'TIL something interesting',
      })
      expect(getQueueItemTitle(item)).toBe('TIL something interesting')
    })

    it('returns "Reddit Post" for Reddit items without title', () => {
      const item = createMockItem({
        type: 'reddit',
        redditTitle: undefined,
      })
      expect(getQueueItemTitle(item)).toBe('Reddit Post')
    })

    it('returns note content for note items', () => {
      const item = createMockItem({
        type: 'note',
        noteContent: 'Remember to buy milk',
      })
      expect(getQueueItemTitle(item)).toBe('Remember to buy milk')
    })

    it('truncates long note content with ellipsis', () => {
      const longContent = 'B'.repeat(100)
      const item = createMockItem({
        type: 'note',
        noteContent: longContent,
      })
      const result = getQueueItemTitle(item)
      expect(result).toHaveLength(63) // 60 chars + '...'
      expect(result.endsWith('...')).toBe(true)
    })

    it('returns "Note" for note items without content', () => {
      const item = createMockItem({
        type: 'note',
        noteContent: undefined,
      })
      expect(getQueueItemTitle(item)).toBe('Note')
    })

    it('returns caption for image items with caption', () => {
      const item = createMockItem({
        type: 'image',
        imageCaption: 'My photo caption',
        imageName: 'photo.jpg',
      })
      expect(getQueueItemTitle(item)).toBe('My photo caption')
    })

    it('returns filename for image items without caption', () => {
      const item = createMockItem({
        type: 'image',
        imageCaption: undefined,
        imageName: 'photo.jpg',
      })
      expect(getQueueItemTitle(item)).toBe('photo.jpg')
    })

    it('returns "Image" for image items without caption or filename', () => {
      const item = createMockItem({
        type: 'image',
        imageCaption: undefined,
        imageName: undefined,
      })
      expect(getQueueItemTitle(item)).toBe('Image')
    })
  })

  describe('getQueueItemSubtitle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('includes duration and addedBy for YouTube items', () => {
      const item = createMockItem({
        type: 'youtube',
        duration: '10:30',
        addedBy: 'Alice',
      })
      expect(getQueueItemSubtitle(item)).toBe('10:30 · Added by Alice')
    })

    it('handles missing duration for YouTube items', () => {
      const item = createMockItem({
        type: 'youtube',
        duration: undefined,
        addedBy: 'Alice',
      })
      expect(getQueueItemSubtitle(item)).toBe(' · Added by Alice')
    })

    it('includes author and addedBy for tweet items', () => {
      const item = createMockItem({
        type: 'tweet',
        tweetAuthor: 'John Doe',
        addedBy: 'Bob',
      })
      expect(getQueueItemSubtitle(item)).toBe('John Doe · Added by Bob')
    })

    it('includes subreddit and addedBy for Reddit items', () => {
      const item = createMockItem({
        type: 'reddit',
        subreddit: 'r/programming',
        addedBy: 'Charlie',
      })
      expect(getQueueItemSubtitle(item)).toBe('r/programming · Added by Charlie')
    })

    it('shows "Completed" for completed note items', () => {
      const item = createMockItem({
        type: 'note',
        addedBy: 'Dave',
        isCompleted: true,
      })
      expect(getQueueItemSubtitle(item)).toBe('Completed · Added by Dave')
    })

    it('shows due date for note items with due date', () => {
      const item = createMockItem({
        type: 'note',
        addedBy: 'Eve',
        dueDate: '2024-01-16T12:00:00Z', // Tomorrow
      })
      expect(getQueueItemSubtitle(item)).toBe('Due tomorrow · Added by Eve')
    })

    it('shows only addedBy for note items without due date', () => {
      const item = createMockItem({
        type: 'note',
        addedBy: 'Frank',
        dueDate: undefined,
      })
      expect(getQueueItemSubtitle(item)).toBe('Added by Frank')
    })

    it('shows addedBy for image items', () => {
      const item = createMockItem({
        type: 'image',
        addedBy: 'Grace',
      })
      expect(getQueueItemSubtitle(item)).toBe('Added by Grace')
    })
  })
})
