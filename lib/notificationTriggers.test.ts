import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}))

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

// Store original env
const originalEnv = process.env

describe('notificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('areNotificationsEnabled', () => {
    it('returns true by default (no preference stored)', async () => {
      const localStorageMock = window.localStorage as unknown as { getItem: ReturnType<typeof vi.fn> }
      localStorageMock.getItem.mockReturnValue(null)

      const { areNotificationsEnabled } = await import('./notificationTriggers')
      expect(areNotificationsEnabled()).toBe(true)
    })

    it('returns false when explicitly disabled', async () => {
      const localStorageMock = window.localStorage as unknown as { getItem: ReturnType<typeof vi.fn> }
      localStorageMock.getItem.mockReturnValue('false')

      const { areNotificationsEnabled } = await import('./notificationTriggers')
      expect(areNotificationsEnabled()).toBe(false)
    })

    it('returns true when set to true', async () => {
      const localStorageMock = window.localStorage as unknown as { getItem: ReturnType<typeof vi.fn> }
      localStorageMock.getItem.mockReturnValue('true')

      const { areNotificationsEnabled } = await import('./notificationTriggers')
      expect(areNotificationsEnabled()).toBe(true)
    })
  })

  describe('triggerItemAddedNotification', () => {
    it('skips in mock mode (no Supabase URL)', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification(
        'party-1',
        { id: 'item-1', type: 'youtube', title: 'Cool Video', addedBy: 'Alice' },
        'session-alice',
        [
          { sessionId: 'session-alice', name: 'Alice' },
          { sessionId: 'session-bob', name: 'Bob' },
        ],
      )

      // Should not call supabase in mock mode
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('sends notifications to other members (excluding sender)', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification(
        'party-1',
        { id: 'item-1', type: 'youtube', title: 'Cool Video', addedBy: 'Alice' },
        'session-alice',
        [
          { sessionId: 'session-alice', name: 'Alice' },
          { sessionId: 'session-bob', name: 'Bob' },
          { sessionId: 'session-carol', name: 'Carol' },
        ],
      )

      // Should notify Bob and Carol but not Alice
      expect(mockInsert).toHaveBeenCalledTimes(2)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_session_id: 'session-bob',
          party_id: 'party-1',
          notification_type: 'item_added',
        }),
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_session_id: 'session-carol',
        }),
      )
    })

    it('does nothing when sender is the only member', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification('party-1', { id: 'item-1', type: 'note', noteContent: 'Hello' }, 'session-a', [
        { sessionId: 'session-a', name: 'Solo' },
      ])

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('getItemTitle (via triggerItemAddedNotification)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    })

    it('uses title for YouTube items', async () => {
      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification('p1', { id: 'i1', type: 'youtube', title: 'My Video' }, 's1', [
        { sessionId: 's1', name: 'A' },
        { sessionId: 's2', name: 'B' },
      ])

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ queue_item_id: 'i1' }))
    })

    it('handles tweet items with author', async () => {
      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification('p1', { id: 'i1', type: 'tweet', tweetAuthor: '@user' }, 's1', [
        { sessionId: 's1', name: 'A' },
        { sessionId: 's2', name: 'B' },
      ])

      expect(mockInsert).toHaveBeenCalled()
    })

    it('handles image items with caption', async () => {
      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification('p1', { id: 'i1', type: 'image', imageCaption: 'Sunset' }, 's1', [
        { sessionId: 's1', name: 'A' },
        { sessionId: 's2', name: 'B' },
      ])

      expect(mockInsert).toHaveBeenCalled()
    })

    it('handles unknown type with fallback', async () => {
      const { triggerItemAddedNotification } = await import('./notificationTriggers')
      await triggerItemAddedNotification('p1', { id: 'i1' }, 's1', [
        { sessionId: 's1', name: 'A' },
        { sessionId: 's2', name: 'B' },
      ])

      expect(mockInsert).toHaveBeenCalled()
    })
  })
})
